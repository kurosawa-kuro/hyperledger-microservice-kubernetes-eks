import duckdb
import sys
import json

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 transform_duckdb.py <parquet_file>", file=sys.stderr)
        sys.exit(1)

    filepath = sys.argv[1]
    
    try:
        con = duckdb.connect(database=':memory:')
        con.execute(f"""
            SELECT 
                CAST(timestamp AS TIMESTAMP) AS timestamp,
                message,
                level
            FROM read_parquet('{filepath}')
            WHERE level = 'ERROR'
        """)
        rows = con.fetchall()
        cols = [desc[0] for desc in con.description]

        json_output = [dict(zip(cols, row)) for row in rows]
        print(json.dumps(json_output, default=str))
        
    except Exception as e:
        print(f"[DuckDB Error] {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
