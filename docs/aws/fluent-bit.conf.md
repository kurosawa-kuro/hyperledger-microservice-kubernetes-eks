了解しました。以下の目的に沿って、Lightsail 専用の Fluent Bit チュートリアルをリファクタリングします：

- Lightsail上でFluent Bitの基礎を確実に習得すること
- CloudWatch Logs（ERRORログ）とFirehose→S3（INFO/アクセスログ）への振り分けをMVPとして構築
- 他の環境（EKS, Fargateなど）への発展に備えて構成の柔軟性を意識
- コンピューティングリソースに制約のある環境でも再現性が高くPoCに適している構成

また、systemd 常駐化・永続稼働構成についても、MVP観点からメリット・デメリットを比較した上で、「推奨構成」として明示的に提案します。IAMロール構成、ロググループ・Firehose設定、検証用のログ生成方法も含めて、Lightsail環境で初めて触れる開発者向けに構成します。

しばらくお待ちください。完了次第、リファクタリング済みのチュートリアルをお渡しします。

# Amazon LightsailでのFluent Bitログルーティングチュートリアル

## はじめに
Amazon Lightsail上のインスタンスから、アプリケーションログを**Amazon CloudWatch Logs**および**Amazon S3（Parquet形式）**に送信するログ基盤を構築します。軽量ログルーターである**Fluent Bit**を用いれば、1つのログストリームから複数の送信先（今回はCloudWatch LogsとKinesis Data Firehose）へ同時に転送することが可能です ([Using Fluent Bit | EKS Workshop](https://www.eksworkshop.com/docs/observability/logging/pod-logging/fluentbit-setup#:~:text=Fluent%20Bit%20is%20a%20lightweight,Streams%20and%20Amazon%20OpenSearch%20Service))。本チュートリアルではLightsail環境に最適化し、不要な選択肢を省いた最小構成で以下を実現します：

- **ERRORレベルのログのみをCloudWatch Logsに送信**し、重要なエラーをリアルタイムに確認できるようにする  
- **INFOレベルのアクセスログはKinesis Data Firehose経由でS3に保存**し、Parquet形式で蓄積・分析できるようにする（Firehose側でのパーケット変換を想定）  
- Fluent Bitの**インストール**から**設定ファイル（`SERVICE`/`INPUT`/`FILTER`/`OUTPUT`/`PARSER`）作成、動作確認**までを段階的に解説  
- **IAMの最小権限ポリシー**を提示し、Lightsailでの認証情報の設定方法を説明  
- Fluent Bitをシステム常駐プロセスとして動かすべきか（`systemd`利用）についてMVP段階の視点で検討し、必要であればサービス起動スクリプトのテンプレートを提供  

本チュートリアルはPoC/MVP段階の開発者を対象としており、シンプルかつ再現性の高い構成を重視しています。特にLightsailはEC2と異なりIAMロールのアタッチをサポートしないため、認証情報の扱いに注意が必要です（LightsailではインスタンスにIAMロールを割り当てる機能がなく、アクセスキーの直接利用が推奨されています ([amazon web services - How do I assign an IAM role to a lightsail instance? - Stack Overflow](https://stackoverflow.com/questions/78142518/how-do-i-assign-an-iam-role-to-a-lightsail-instance#:~:text=Amazon%20Lightsail%20servers%20use%20the,Best%20practices))）。以下、順を追って構築を進めます。

## Fluent Bitのインストール（Lightsail）
まずLightsail上の仮想サーバーにFluent Bitを導入します。ここでは例として**Amazon Linux 2**系のOSを使用している前提で説明します（Ubuntuの場合はAPTリポジトリを追加する手順に読み替えてください）。公式のインストール方法として、一行で最新バージョンをインストールできるスクリプトが提供されています ([Amazon Linux | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/installation/linux/amazon-linux#:~:text=Fluent%20Bit%20provides%20an%20installation,the%20most%20recently%20released%20version))が、再現性を重視しここではリポジトリを追加してパッケージ管理経由でインストールします。

1. **Fluent Bit公式リポジトリの追加**: パッケージリポジトリ設定ファイルを作成します。Amazon Linux 2の場合、`/etc/yum.repos.d/fluent-bit.repo`に以下の内容を追加します ([Amazon Linux | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/installation/linux/amazon-linux#:~:text=Copy))（Ubuntuの場合はAPTソースを追加）。  

    ```bash
    [fluent-bit]
    name=Fluent Bit
    baseurl=https://packages.fluentbit.io/amazonlinux/2/
    gpgcheck=1
    gpgkey=https://packages.fluentbit.io/fluentbit.key
    enabled=1
    ```

2. **Fluent Bitパッケージのインストール**: リポジトリ追加後、以下のコマンドでFluent Bit本体をインストールします ([Amazon Linux | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/installation/linux/amazon-linux#:~:text=Copy))。  

    ```bash
    sudo yum install -y fluent-bit
    ```  

    > ※Ubuntuの場合は`apt-get install fluent-bit`（リポジトリ追加済みの場合）を実行します。

3. **サービスの自動起動設定**: パッケージには既にSystemdのサービススクリプトが含まれており、インストール後に`fluent-bit`サービスが利用可能です ([Amazon Linux | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/installation/linux/amazon-linux#:~:text=%24%20systemctl%20status%20fluent,bit.conf))。まだ設定ファイルを用意していないため、この時点ではサービスを開始せず、自動起動を無効化または停止しておきます（後で設定を反映してから有効化します）。  

    ```bash
    sudo systemctl disable --now fluent-bit
    ```  

    上記によりFluent Bitが常駐プロセスとして起動していないことを確認しておきます。

## Fluent Bitの設定ファイル作成（CloudWatch LogsとFirehoseへの振り分け）
次に、Fluent Bitの設定ファイルを作成します。設定ファイルは通常`/etc/fluent-bit/fluent-bit.conf`に配置し、複数のセクション（**SERVICE**／**INPUT**／**FILTER**／**OUTPUT**／**PARSER**）から構成されます。それぞれのセクションで以下のような役割を果たします。

- **[SERVICE]**: Fluent Bitデーモン全体の設定（ログレベルやバッファ設定など）  
- **[INPUT]**: 収集するログの入力元（ファイルやシステムログなど）を定義  
- **[FILTER]**: 入力されたログレコードに対する加工やフィルタリング処理を定義  
- **[OUTPUT]**: 転送先サービスの定義（今回はCloudWatch LogsとKinesis Firehose）  
- **[PARSER]**: 特定のログ形式を構文解析するルールを定義（必要に応じて使用）  

Lightsail上では例えばWebサーバ（Apache/Nginx）やアプリケーションの**アクセスログ**と**エラーログ**がそれぞれファイルに出力されているケースが多いでしょう。本構成では以下のようにログを扱います。

- **アクセスログ**（基本INFOレベル）: 例としてApacheのアクセスログ (`/var/log/apache2/access.log`) を対象とし、**Kinesis Data Firehose**経由でS3に送ります（パーケット変換はFirehose側の機能を利用）。  
- **エラーログ**（ERRORレベルのみ抽出）: 例としてApacheのエラーログ (`/var/log/apache2/error.log`) を対象とし、Fluent Bit側でERRORレベルのものだけを抽出して**CloudWatch Logs**に送ります。  

それでは各セクションごとに設定内容を示していきます。必要に応じてコメントを付与しています。

### [SERVICE]セクション – サービス全体の設定
```ini
# Fluent Bitサービス全体の設定
[SERVICE]
    Flush        1        # バッファフラッシュ間隔1秒（デフォルトは5秒）
    Daemon       Off      # Daemon=Offでフォアグラウンド実行（systemdサービスではOff推奨）
    Log_Level    info     # Fluent Bit自身のログレベル（info以上のログを出力） ([Fail to transfer only ERROR and WARN log using fluentbit Loglevel](https://groups.google.com/g/fluent-bit/c/2XR8PV7fH4I#:~:text=That%20log_level%20is%20related%20to,events%20you%20do%20not%20need))
    Parsers_File parsers.conf  # パーサ定義ファイルの読み込み（Apacheログ用の既定パーサを利用）
```
- **Flush**: バッファしたログを出力先に送信する間隔秒です。開発・検証段階では短めの`1`秒とし、リアルタイム性を優先しています（本番環境では負荷とコストを考慮し調整してください）。  
- **Daemon**: `Off`を指定することでバックグラウンドにデタッチせず動作します。systemdで管理する場合やデバッグ時には`Off`が適切です。  
- **Log_Level**: Fluent Bit自身のログ出力レベルを指定します。※**注意**: ここで指定するレベルはFluent Bitエージェント自体のログであり、**収集対象のログレベルをフィルタリングするものではありません** ([Fail to transfer only ERROR and WARN log using fluentbit Loglevel](https://groups.google.com/g/fluent-bit/c/2XR8PV7fH4I#:~:text=That%20log_level%20is%20related%20to,events%20you%20do%20not%20need))。後述するフィルタセクションでアプリケーションログのレベルを絞り込む必要があります。  
- **Parsers_File**: Fluent Bitに同梱のパーサ定義ファイルを指定します。これによりApacheやNginxのログ形式用にあらかじめ用意されたパーサ（正規表現）が利用可能になります。本チュートリアルでは後述するように、Apacheの既定パーサ`apache`および`apache_error`を使用します ([fluent-bit/conf/parsers.conf at master · fluent/fluent-bit · GitHub](https://github.com/fluent/fluent-bit/blob/master/conf/parsers.conf#:~:text=Name%20apache)) ([fluent-bit/conf/parsers.conf at master · fluent/fluent-bit · GitHub](https://github.com/fluent/fluent-bit/blob/master/conf/parsers.conf#:~:text=Name%20apache_error))。

### [INPUT]セクション – アクセスログの収集定義
```ini
# アクセスログ（例: Apacheアクセスログ）の入力設定
[INPUT]
    Name        tail
    Tag         apache_access      # この入力に付与するタグ（出力先ルーティング用）
    Path        /var/log/apache2/access.log
    Parser      apache             # Apacheアクセスログ用の既定パーサを適用 ([fluent-bit/conf/parsers.conf at master · fluent/fluent-bit · GitHub](https://github.com/fluent/fluent-bit/blob/master/conf/parsers.conf#:~:text=Name%20apache))
    DB          /var/log/flb_access.db   # フックポイント用データベース（重複送信防止）
    Mem_Buf_Limit 5MB             # メモリバッファ上限
    Skip_Long_Lines On            # 長すぎる行はスキップ
```
- **Name**: 使用する入力プラグイン名です。`tail`はファイルを末尾から読み取るプラグインで、ログファイルの追加分を継続的に収集します。  
- **Tag**: この入力からのログレコードに付与するタグ名です。出力先ルールでこのタグを指定してルーティングするため、分かりやすく`apache_access`と命名しています。  
- **Path**: 読み取るログファイルのパスです。Apacheのアクセスログパスを指定しています。ワイルドカード指定も可能ですが、今回は単一ファイルを対象にしています。  
- **Parser**: この入力に対して適用するログ解析パーサを指定します。ここではFluent Bitに標準で用意されている`apache`パーサを使用しています。`apache`パーサはApache/NCSA形式のアクセスログ行を解析し、ホスト、ユーザー、メソッド、パス、ステータスコード、バイトサイズ、リファラ、ユーザーエージェントといったフィールドに分解します ([fluent-bit/conf/parsers.conf at master · fluent/fluent-bit · GitHub](https://github.com/fluent/fluent-bit/blob/master/conf/parsers.conf#:~:text=Name%20apache))。解析結果は構造化データ（JSONオブジェクト）として以降の処理に渡されます。  
- **DB**: Fluent Bitはログの読み取りオフセットを管理するために内部DBファイルを使用できます。`DB`オプションでファイルパスを指定すると、Fluent Bit再起動時にも前回の続き（最終読み取り位置）から処理を再開できます。ここでは`/var/log/flb_access.db`というファイルにその情報を保存します。  
- **Mem_Buf_Limit**: この入力に割り当てるメモリバッファの上限サイズです。ログ流量が一時的に出力先処理を上回った場合などにバッファリングされます。5MB程度を上限としています（必要に応じて調整）。  
- **Skip_Long_Lines**: パーサで処理できないほど長い行があった場合にその行をスキップする設定です。`On`にすることで、極端に長いログ行によるパーサ破綻を防ぎます。  

解析の結果、アクセスログは例えば以下のようなJSON形式のレコードに変換されます（例） ([Parser | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/concepts/data-pipeline/parser#:~:text=Copy)):

```json
{
  "host": "192.168.2.20",
  "user": "-",
  "method": "GET",
  "path": "/cgi-bin/try/",
  "code": "200",
  "size": "3395",
  "referer": "",
  "agent": "curl/7.68.0"
}
```

この構造化データがそのまま後続のFirehose出力で送信され、Firehose側でのParquet変換に活用されます。

### [INPUT]セクション – エラーログの収集定義
```ini
# エラーログ（例: Apacheエラーログ）の入力設定
[INPUT]
    Name        tail
    Tag         apache_error       # エラーログ用のタグ
    Path        /var/log/apache2/error.log
    Parser      apache_error       # Apacheエラーログ用の既定パーサを適用 ([fluent-bit/conf/parsers.conf at master · fluent/fluent-bit · GitHub](https://github.com/fluent/fluent-bit/blob/master/conf/parsers.conf#:~:text=Name%20apache_error))
    DB          /var/log/flb_error.db
    Mem_Buf_Limit 5MB
    Skip_Long_Lines On
```
- **Parser**: アクセスログと同様にパーサを適用しています。Apacheエラーログには`apache_error`という既定パーサを利用します。このパーサは、Apacheエラーログの各行からタイムスタンプ、ログレベル、プロセスID、クライアントIP、メッセージ本体を抽出する正規表現が定義されています ([fluent-bit/conf/parsers.conf at master · fluent/fluent-bit · GitHub](https://github.com/fluent/fluent-bit/blob/master/conf/parsers.conf#:~:text=Format%20regex))。例えば、`[Wed Oct 11 14:32:52.123456 2023] [error] [pid 1234] [client 10.0.0.1] Example error message`というログ行であれば、`level: "error"`, `message: "Example error message"`のようにフィールド化されます。  

Apacheのエラーログには`[error]`の他に`[warn]`や`[notice]`など異なるレベルのエントリも含まれます。本構成では後述のフィルタにより**ERRORレベルのエントリのみに絞り込む**ため、パーサできちんと`level`フィールドが抽出されることが重要です。

その他の項目（Name, Tag, Path, DB等）はアクセスログの入力と同様の意味を持ちます。`Tag`は`apache_error`とし、出力先ルールでこのタグを使用してCloudWatch Logsに振り分けます。

### [FILTER]セクション – エラーログのレベルフィルタ（ERRORのみ抽出）
```ini
# ERRORレベルのログのみに絞り込むフィルタ
[FILTER]
    Name    grep
    Match   apache_error           # エラーログのタグにのみ適用
    Regex   level    error         # フィールド'level'が'error'にマッチするものだけ通す ([Grep | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/1.3/filter/grep#:~:text=,txt))
```
- **Name**: 使用するフィルタプラグイン名です。`grep`プラグインはログレコード中の特定のフィールド値が正規表現に一致するかどうかでレコードを通過/除外させるフィルタです ([Grep | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/1.3/filter/grep#:~:text=,txt))。  
- **Match**: このフィルタを適用するレコードのタグを指定します。`apache_error`タグ（エラーログ由来のレコード）にのみ適用することで、アクセスログには影響を与えません。  
- **Regex**: フィルタ条件として*フィールド名*と*正規表現*を指定します。ここでは`level`フィールド（先ほどパーサで抽出されたログレベル）に対し、`error`という正規表現を適用しています。つまり、`level`が"error"と一致するレコード**のみ**を通過させます。  

このフィルタによって、Apacheエラーログ中の**ERRORレベル**のエントリだけが後段の出力プラグインに渡され、**それ以外のレベル（warnやnoticeなど）は破棄**されます。なお、同様のことは`Exclude`オプションを使って「errorでないものを除外」する形でも実現できますが、ここではシンプルに「errorにマッチするものを許可」しています。  

> **解説:** Fluent Bitの[SERVICE]セクションで設定した`Log_Level`は繰り返しになりますが、Fluent Bit自身のログ出力レベルの指定です。収集データのレベルを間引くにはこのようにGrepフィルタを使う必要があります ([Fail to transfer only ERROR and WARN log using fluentbit Loglevel](https://groups.google.com/g/fluent-bit/c/2XR8PV7fH4I#:~:text=That%20log_level%20is%20related%20to,events%20you%20do%20not%20need))。Lightsailのような単一ホスト環境では、不要なログを転送しないことでCloudWatch Logsのデータ保存量を削減できます。

### [OUTPUT]セクション – CloudWatch Logsへの出力（ERRORログ用）
```ini
# CloudWatch Logs出力設定（ERRORログ用）
[OUTPUT]
    Name            cloudwatch_logs      # CloudWatch Logs出力プラグイン
    Match           apache_error         # apache_errorタグのレコードを送信
    region          us-east-1            # AWSリージョン（例: us-east-1）
    log_group_name  LightsailAppLogs     # ロググループ名（任意に作成）
    log_stream_name error-log            # ログストリーム名（任意に作成）
    auto_create_group On                 # ロググループが存在しない場合に自動作成 ([Amazon CloudWatch | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch#:~:text=,))
```
- **Name**: 使用する出力プラグイン名です。AWS公式のCloudWatch Logsプラグインの場合、新しい高性能実装の名前は`cloudwatch_logs`です ([Amazon CloudWatch | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch#:~:text=This%20is%20the%20documentation%20for,plan%20for%20the%20original%20plugin))（古いプラグイン名`cloudwatch`も存在しますが非推奨）。  
- **Match**: どのタグのレコードをこの出力にマッチさせるかを指定します。`apache_error`タグを持つレコード（つまりERRORレベルのエラーログ）だけがCloudWatch Logsに送信されます。  
- **region**: CloudWatch Logsに送る先のリージョンを指定します。Lightsailインスタンスを設置したリージョンに合わせるとよいでしょう（例では`us-east-1`としています）。  
- **log_group_name**: 送信先のCloudWatch Logsロググループ名です。指定した名前のロググループが存在しない場合、`auto_create_group On`を有効にしていればFluent Bitが自動で作成します。例えばここでは`LightsailAppLogs`というグループ名を指定しています。  
- **log_stream_name**: 送信先のログストリーム名です。今回はシンプルに`error-log`としています。ロググループ内でログストリームが存在しなければ自動生成されます。なお、複数のLightsailインスタンスやアプリケーションごとにストリームを分けたい場合は、`${TAG}`やホスト名を組み合わせた動的名前（テンプレート）を使用することも可能です。例えば、`log_stream_prefix`や`log_stream_name`に`{instance_id}`を含めるなど柔軟な指定が可能ですが、MVP段階では静的に設定しておけば問題ありません。  
- **auto_create_group**: `On`にすると、指定したロググループが無い場合にFluent Bitが自動で作成します ([Amazon CloudWatch | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch#:~:text=,))（CloudWatch Logsの`logs:CreateLogGroup`権限が必要）。手動で先にロググループを作成しておく場合は`Off`にできます。

CloudWatch Logsへの出力設定では、Fluent Bitは一定量のログごとに`PutLogEvents` APIを呼び出してクラウドに送信します。このため、後述するIAM権限として**`logs:CreateLogGroup`**, **`logs:CreateLogStream`**, **`logs:PutLogEvents`**が必要になります（いずれもリソースは対象のロググループに限定可能ですが、本稿では簡便のためワイルドカードにしています） ([Amazon CloudWatch | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch#:~:text=,))。

### [OUTPUT]セクション – Kinesis Data Firehoseへの出力（アクセスログ用）
```ini
# Kinesis Data Firehose出力設定（INFOアクセスログ用）
[OUTPUT]
    Name            kinesis_firehose    # Firehose出力プラグイン
    Match           apache_access       # apache_accessタグのレコードを送信
    region          us-east-1           # AWSリージョン（例: us-east-1）
    delivery_stream MyApp-Logs-Firehose # Firehose配信ストリーム名
    # (オプション) 圧縮やタイムスタンプオプションの指定も可能
    # time_key time
    # time_key_format %Y-%m-%dT%H:%M:%S
    # compression   gzip
```
- **Name**: 使用する出力プラグイン名です。Kinesis Data Firehose用のプラグインは新実装では`kinesis_firehose`と指定します（古いGo実装では`firehose`でしたが現在は統一されています ([Amazon Kinesis Data Firehose | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/firehose#:~:text=This%20is%20the%20documentation%20for,to%20prevent%20conflicts%2Fconfusion))）。  
- **Match**: どのタグのログを送るか指定します。`apache_access`タグのレコード（アクセスログ由来のINFOレベルログ）がマッチし、Firehoseに送信されます。  
- **region**: Firehoseストリームが存在するリージョンを指定します。CloudWatchと同様、LightsailのAWSアカウントのリージョンに合わせます（例では`us-east-1`）。  
- **delivery_stream**: 送信先のKinesis Data Firehose配信ストリーム名です。あらかじめAWS側でこの名前のDelivery Streamを作成しておく必要があります。ここでは例として`MyApp-Logs-Firehose`としています。  

必要に応じてFirehose出力には追加オプションを設定できます。例えば`time_key`と`time_key_format`を指定すれば各レコードにFluent Bitのタイムスタンプを含めることができます ([Amazon Kinesis Data Firehose | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/firehose#:~:text=time_key))。また`compression`オプションで送信時にデータを個別に圧縮することも可能です（`gzip`や、Apache Arrowフォーマットの`arrow`が指定可能 ([Amazon Kinesis Data Firehose | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/firehose#:~:text=compression))）。圧縮はFirehoseに送るデータ容量を削減できますが、Firehose側での変換処理（後述）との兼ね合いもあるため、MVP段階では特に指定せずプレーンなJSONレコードを送る構成としています。

アクセスログは前述のパーサでJSON構造化されているため、そのままFirehoseに送られます。**Firehose側ではこのJSONレコードをもとにParquet形式への変換とS3バケットへの保存が行われます**（AWSコンソールでFirehose配信ストリームの設定時に「Record format conversion」を有効化し、Glueデータカタログでスキーマを定義することで、JSON→Parquet変換が可能です）。Fluent Bitは単にレコードをFirehoseに渡し、Firehoseサービスがバッファ・変換・保存を担当する流れになります ([Using Fluent Bit | EKS Workshop](https://www.eksworkshop.com/docs/observability/logging/pod-logging/fluentbit-setup#:~:text=Fluent%20Bit%20is%20a%20lightweight,Streams%20and%20Amazon%20OpenSearch%20Service))。

Firehose出力に必要なIAM権限は**`firehose:PutRecordBatch`**（および内部で使用される`PutRecord`相当）です ([Amazon Kinesis Data Firehose | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/firehose#:~:text=%7B%20%22Version%22%3A%20%222012,))。Fluent Bitは一定件数のログをまとめて`PutRecordBatch`で送信するため、単一権限で済みます。こちらも後述のIAMポリシーに含めます。

以上で、Fluent Bitの設定ファイル (`fluent-bit.conf`) の各セクション定義は完成です。設定全体をまとめると以下のようになります。

```ini
################## Fluent Bit Configuration ##################
[SERVICE]
    Flush        1
    Daemon       Off
    Log_Level    info
    Parsers_File parsers.conf

[INPUT]
    Name   tail
    Tag    apache_access
    Path   /var/log/apache2/access.log
    Parser apache
    DB     /var/log/flb_access.db

[INPUT]
    Name   tail
    Tag    apache_error
    Path   /var/log/apache2/error.log
    Parser apache_error
    DB     /var/log/flb_error.db

[FILTER]
    Name   grep
    Match  apache_error
    Regex  level  error

[OUTPUT]
    Name            cloudwatch_logs
    Match           apache_error
    region          us-east-1
    log_group_name  LightsailAppLogs
    log_stream_name error-log
    auto_create_group On

[OUTPUT]
    Name            kinesis_firehose
    Match           apache_access
    region          us-east-1
    delivery_stream MyApp-Logs-Firehose
##############################################################
```

この内容をLightsailインスタンス上の`/etc/fluent-bit/fluent-bit.conf`に保存してください（既存の内容は置き換えて問題ありません）。  

## IAMロール/ユーザーの設定（必要最小権限ポリシー）
Fluent BitがCloudWatchやFirehoseといったAWSサービスにログを送信するためには、該当サービスのAPIを呼び出すためのAWS認証情報（Credentials）と必要権限が必要です。通常、EC2ではIAMロールをインスタンスに付与することで一時的な認証情報を取得できますが、**LightsailはIAMロールのアタッチをサポートしていません** ([amazon web services - How do I assign an IAM role to a lightsail instance? - Stack Overflow](https://stackoverflow.com/questions/78142518/how-do-i-assign-an-iam-role-to-a-lightsail-instance#:~:text=Amazon%20Lightsail%20servers%20use%20the,Best%20practices))。そのため、本チュートリアルではIAMユーザーを利用し、アクセスキーとシークレットキーをLightsailインスタンス上に設定する方法をとります（Lightsailではこれが事実上のベストプラクティスです ([amazon web services - How do I assign an IAM role to a lightsail instance? - Stack Overflow](https://stackoverflow.com/questions/78142518/how-do-i-assign-an-iam-role-to-a-lightsail-instance#:~:text=lot%20of%20EC2%20features%20are,Best%20practices))）。

### IAMポリシーの作成
まずAWS側で、Fluent Bit用に必要最小限の権限を持つIAMポリシーを作成します。下記は本構成における最小権限のポリシーJSON例です。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "firehose:PutRecordBatch",
      "Resource": "*"
    }
  ]
}
```

- CloudWatch Logs用の権限: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`（ロググループやストリームの作成とログ書き込みに必要なAPI） ([Amazon CloudWatch | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/cloudwatch#:~:text=,))  
- Kinesis Firehose用の権限: `firehose:PutRecordBatch`（バッチでデータを投入するAPI） ([Amazon Kinesis Data Firehose | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/pipeline/outputs/firehose#:~:text=%7B%20%22Version%22%3A%20%222012,))  

上記では`Resource: "*"`としていますが、必要に応じてリソースARNを指定して権限を限定することも可能です（例: 特定のLog Group ARNやFirehose ARNを指定）。しかしMVP段階ではシンプルさを優先しワイルドカードとしています。ポリシーのセキュリティを高める改善余地として念頭に置いてください。

このポリシーをAWSマネジメントコンソールのIAMより作成し、Lightsail用のIAMユーザーまたはIAMロールにアタッチします。Lightsailでは前述のとおりIAMロールを直接使えないため、ここではIAMユーザーを新規作成しこのポリシーをアタッチする手順を想定します。作成したIAMユーザーの**アクセスキーID**と**シークレットアクセスキー**を控えておいてください。

### Lightsailインスタンスへの認証情報の適用
次に、上記IAMユーザーの認証情報をLightsailインスタンスのFluent Bitが利用できるよう設定します。方法は2通りあります。

1. **環境変数として設定** – Fluent BitはAWS SDKのクレデンシャルプロバイダを内部で利用しており、環境変数`AWS_ACCESS_KEY_ID`および`AWS_SECRET_ACCESS_KEY`が設定されていればそれを認識します。そのため、Systemdのサービスに環境変数としてこれらを渡す方法が簡便です。  
2. **AWS設定ファイルを配置** – インスタンス内にAWS CLIのクレデンシャルファイル（例: `/home/<ユーザ>/.aws/credentials`）を配置する方法です。例えばLightsailインスタンスで`aws configure`コマンドを実行し、先ほどのアクセスキーとシークレットキーを入力すると、デフォルトプロファイルの認証情報が設定されます。Fluent Bitは実行ユーザ（デフォルトでは`root`）のホームディレクトリのクレデンシャルファイルも自動的に参照します。  

ここでは**方法1（環境変数）の設定**手順を説明します。Systemdのサービスユニットをカスタマイズし、Fluent Bit起動時に環境変数を読み込ませます。

1. エディタでFluent Bitのサービス定義を開きます。パッケージインストールした場合、ユニットファイルは`/usr/lib/systemd/system/fluent-bit.service`にあります。`sudo vim /usr/lib/systemd/system/fluent-bit.service`などで開き、`[Service]`セクションに環境変数を追記します（以下は例です）。

    ```ini
    [Service]
    Type=simple
    ExecStart=/opt/fluent-bit/bin/fluent-bit -c /etc/fluent-bit/fluent-bit.conf
    Restart=on-failure
    Environment="AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>"
    Environment="AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>"
    Environment="AWS_DEFAULT_REGION=us-east-1"
    ```

    上記の`<YOUR_ACCESS_KEY_ID>`や`<YOUR_SECRET_ACCESS_KEY>`をIAMユーザーの値に置き換えてください。また`AWS_DEFAULT_REGION`はFluent Bitの設定ファイル内でリージョンを指定済みであれば必須ではありませんが、念のため設定しています。  

2. ユニットファイルを保存したら、Systemdに変更を認識させるため`sudo systemctl daemon-reload`を実行します。  

> 上記のように直接ユニットファイルを編集する代わりに、`sudo systemctl edit fluent-bit`でオーバーライド設定を追加する方法もあります。例えば以下の内容を追加すれば同様の効果が得られます。  
> ```ini
> [Service]
> Environment="AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>"
> Environment="AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>"
> Environment="AWS_DEFAULT_REGION=us-east-1"
> ```  
> 企業ポリシーなどでサービス定義の直接編集が難しい場合はこちらを検討してください。

以上でLightsailインスタンス上にFluent BitがAWS認証情報を取得する準備が整いました。

## Fluent Bitサービスの起動（systemd常駐化）と動作確認
設定ファイルと認証情報の準備ができたら、Fluent Bitを起動します。MVP段階ではフォアグラウンドで動かして様子を見ることもできますが、ここではSystemdによりデーモンとして起動・自動起動設定することを推奨します。Lightsailのような単一サーバ環境でも、Systemdで管理しておけばインスタンス再起動時に自動でログ収集が再開されるため再現性・信頼性が向上します（PoC段階であっても手間は少ないため導入をおすすめします）。

### Fluent Bitサービスの起動と有効化
```bash
# fluent-bitサービスの起動
sudo systemctl start fluent-bit

# 自動起動の有効化（インスタンス再起動後も起動するよう設定）
sudo systemctl enable fluent-bit
```
コマンド実行後、`systemctl status fluent-bit`でステータスを確認し、`Active: active (running)`と表示されていれば起動成功です。加えて、Fluent Bit自身のログ（`/var/log/messages`や`journalctl -u fluent-bit`の出力）にエラーが出ていないことを確認してください。

### ログルーティングの動作確認
最後に、設定どおりにログがCloudWatchとFirehose/S3に振り分けられるか確認します。以下の方法でテストできます。

1. **アクセスログのテストエントリを生成**: Lightsail上のWebサーバ（Apache）が動作している場合、ブラウザや`curl`コマンドで何かリクエストを送りアクセスログにエントリを発生させます。例えば以下のようにリクエストを投げます（実際のホスト名/IPに読み替えてください）。  
   ```bash
   curl http://localhost/hello.txt
   ```  
   実行後、`/var/log/apache2/access.log`に新しい行が追加されていることを確認します（タイムスタンプが現在時刻の行）。Apacheが稼働していない場合は、手動でログファイルに追記しても構いません。例えば:  
   ```bash
   echo '127.0.0.1 - - [01/Nov/2025:12:00:00 +0000] "GET /test HTTP/1.1" 200 123 "-" "TestAgent/1.0"' >> /var/log/apache2/access.log
   ```  
   上記のような書式の行を追加すればパーサが解析できます。

2. **エラーログのテストエントリを生成**: アプリケーションに故意にエラーを発生させるか、Apacheの場合は存在しないページへのリクエストや設定ミスをしてエラーログにエントリを発生させます。難しければ手動で追記しても構いません。例えばApacheエラーログ形式に倣って以下の行を追加します。  
   ```bash
   echo '[Wed Nov 01 12:00:01.000000 2025] [error] [pid 12345] [client 127.0.0.1] Example error message' >> /var/log/apache2/error.log
   ```  
   これは単なる例ですが、`[error]`を含む行を追加することでFluent Bitのgrepフィルタに引っかかるデータを用意しています。

3. **CloudWatch Logsでエラーログを確認**: AWSマネジメントコンソールのCloudWatchサービスに移動し、ロググループ`LightsailAppLogs`（設定で指定した名前）を開きます。数十秒～1分程度で、先ほど発生させたエラーログのエントリが新規ログストリーム（例: `error-log`）に届いているはずです。**ERRORレベルのものしか送信していない**ことを確認するため、もしエラーログに他のレベルのエントリ（warn等）が元々あってもそれらがCloudWatch上に現れていないことも確認してください。

4. **S3でアクセスログを確認**: Firehose経由でS3に配信されたログは、設定したFirehose配信ストリームに紐づくS3バケットに格納されます。数分程度（Firehoseのバッファ間隔によります）待つと、新しいオブジェクトがS3バケットに作成されます。Parquet形式を指定している場合、拡張子が`.parquet`のファイルとして保存されています。Amazon AthenaやParquet対応ツールで中身を確認すると、先ほどのアクセスログエントリがレコードとして含まれているはずです。  

上記手順でそれぞれ**CloudWatch LogsにはERRORログのみが届き**、**S3（経由Firehose）にはアクセスログ（INFO相当）がParquet形式で保存**されていれば、ログルーティングの構成は正しく機能しています。

## システム常駐化（systemd）に関する考察
MVP段階では手動起動で動作検証する選択肢もありますが、Lightsailのような長時間稼働するインスタンスではFluent Bitをsystemdで管理することをおすすめします。今回パッケージインストールしたFluent Bitには標準でsystemdサービスが用意されており、設定ファイルを整えるだけで自動起動まで設定可能でした。 ([Amazon Linux | Fluent Bit: Official Manual](https://docs.fluentbit.io/manual/installation/linux/amazon-linux#:~:text=%24%20systemctl%20status%20fluent,bit.conf)) 

**メリット:**  
- インスタンス再起動時や予期せぬFluent Bitプロセスの異常終了時に自動で再起動してくれるため、ログ収集が中断しにくい  
- 手動手順を減らせるため構成の再現性が高まる  
- SystemdのUnitファイルで環境変数や起動順序（依存関係）を管理できるため、将来的に構成が複雑になっても柔軟に対応できる  

Lightsail上の単一プロセスであっても上記メリットは有用です。よって、本チュートリアルでは初めからsystemdで常駐実行する前提で手順を解説しました。PoC段階でも特段デメリットはないため、このまま運用に移行しても問題ないでしょう。  

将来的に**Amazon ECS (Fargate)**や**Amazon EKS**環境へこの仕組みを展開する際には、Fluent Bit自体をコンテナとして動かす形（FireLensやDaemonSet）になります。その際はsystemdは関係なくなりますが、**今回作成したFluent Bitの設定（入力・フィルタ・出力の定義）はそのまま再利用可能**です。実際、AWSが提供する公式のFluent Bitコンテナイメージ「AWS for Fluent Bit」にはCloudWatch LogsとFirehoseのプラグインが含まれており ([Using Fluent Bit | EKS Workshop](https://www.eksworkshop.com/docs/observability/logging/pod-logging/fluentbit-setup#:~:text=AWS%20provides%20a%20Fluent%20Bit,the%20Amazon%20ECR%20Public%20Gallery))、本チュートリアルで構築したようなログルーティングをコンテナ環境でも容易に実現できます。MVPで得られた知見をそのまま本番環境（ECS/EKS）に応用できる点も、この構成の大きな利点です。

以上、Amazon Lightsail上でのFluent Bitを用いたログ収集・転送の基本構築手順と設定例を紹介しました。最小限の構成ながら、必要な機能（ログレベル別の振り分け、CloudWatchとS3への送信）が実現できています。 ([Using Fluent Bit | EKS Workshop](https://www.eksworkshop.com/docs/observability/logging/pod-logging/fluentbit-setup#:~:text=Fluent%20Bit%20is%20a%20lightweight,Streams%20and%20Amazon%20OpenSearch%20Service)) 今後の発展として、IAMポリシーのリソース制限やFirehose/S3側のデータライフサイクル管理、さらに高度なフィルタリング（例えばマスキングや複数条件）などを検討するとよいでしょう。まずは本チュートリアルの手順でPoCを安定稼働させ、次のステップであるFargateやEKSへの展開に備えてください。

