#!/usr/bin/env python3
import sys
import json
from pathlib import Path

def summarize(nb_path: Path):
    with nb_path.open('r', encoding='utf-8') as f:
        nb = json.load(f)
    cells = nb.get('cells', [])
    rows = []
    for idx, c in enumerate(cells, start=1):
        ctype = c.get('cell_type', '?')
        exec_count = c.get('execution_count') if ctype == 'code' else None
        src = c.get('source') or []
        # Normalize to first non-empty trimmed line
        first_line = next((line.strip() for line in src if line.strip()), '')
        # Keep it short
        if len(first_line) > 100:
            first_line = first_line[:97] + '...'
        rows.append((idx, ctype, exec_count, first_line))

    # Print as a simple table
    print(f"Notebook: {nb_path}")
    print("# | Type | Exec | First line")
    print("-" * 90)
    for idx, ctype, exec_count, first_line in rows:
        exec_str = str(exec_count) if exec_count is not None else "-"
        print(f"{idx:>2} | {ctype:<6} | {exec_str:>4} | {first_line}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        nb = Path('/home/lethanhdat/Desktop/Nexcart2/05_Vietnamese_and_English_Sentiment_Training.ipynb')
    else:
        nb = Path(sys.argv[1]).expanduser().resolve()
        if not nb.exists():
            # Allow passing a relative path from repo root
            candidate = Path('/home/lethanhdat/Desktop/Nexcart2') / sys.argv[1]
            if candidate.exists():
                nb = candidate
    if not nb.exists():
        print("File not found:", nb)
        sys.exit(1)
    summarize(nb)
