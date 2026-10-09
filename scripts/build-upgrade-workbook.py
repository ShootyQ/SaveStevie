"""Build the review workbook from the exported game catalogues (openpyxl)."""
import json
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'docs/upgrade-reference.json').read_text())
OUT = ROOT / 'docs/SaveStevie-Upgrade-Reference.xlsx'
book = Workbook()
book.remove(book.active)
book.properties.title = 'Save Stevie — Upgrade and Retuning Reference'
book.properties.description = f"Alpha {DATA['version']}: current abilities and editable retuning checklist"
book.properties.creator = 'Save Stevie'


def sheet(name, headers, rows, widths, editable=()):
    ws = book.create_sheet(name)
    ws.append(headers)
    for row in rows:
        ws.append([', '.join(map(str, value)) if isinstance(value, list) else value for value in row])
    ws.freeze_panes = 'B2'
    ws.sheet_view.showGridLines = False
    for index, width in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(index)].width = width
    for cell in ws[1]:
        cell.fill = PatternFill('solid', fgColor='26333C')
        cell.font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
        cell.alignment = Alignment(wrap_text=True, vertical='center')
    ws.row_dimensions[1].height = 32
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.font = Font(name='Calibri', size=11, color='25313A')
            cell.alignment = Alignment(wrap_text=True, vertical='top')
            if cell.column in editable:
                cell.fill = PatternFill('solid', fgColor='FFF2CC')
        ws.row_dimensions[row[0].row].height = 88
    table = Table(displayName=name.replace(' ', '') + 'Table', ref=f'A1:{get_column_letter(len(headers))}{ws.max_row}')
    table.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showRowStripes=True)
    ws.add_table(table)
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.paperSize = ws.PAPERSIZE_A3
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = '1:1'
    return ws

summary = [['Version', 'Alpha ' + DATA['version']], ['Run upgrades', len(DATA['upgrades'])], ['Synergies', len(DATA['synergies'])], ['Permanent perks', len(DATA['notebook'])], ['Legendary campaign chance', DATA['legendaryPlan']['chance']], ['Legendary scheduled reward waves', '1–19; at most one reserved offer per campaign'], ['Yellow review cells', 'Fill in your rating, notes, proposed decision and next playtest.'], ['Quick Sketch status', 'Flagged for review; its gameplay effect is unchanged.']]
summary.extend(['Reference note', text] for text in DATA['notes'])
ws = sheet('Read Me', ['Topic', 'Details'], summary, [34, 105])
ws['B6'].number_format = '0.0%'
ws['B6'].value = DATA['legendaryPlan']['chance']
# Chance is row 6 (header plus five preceding summary entries).
sheet('Run Upgrades', ['Upgrade', 'Category', 'Current ability', 'Rarity availability', 'Levels per pick', 'Stacking', 'Caps and conditions', 'Related synergies', 'Source'], [[u[k] for k in ['name', 'category', 'effect', 'rarities', 'levels', 'stacking', 'limits', 'synergies', 'source']] for u in DATA['upgrades']], [28, 26, 75, 36, 42, 35, 70, 55, 22])
sheet('Synergies', ['Synergy', 'Kind', 'Required upgrades', 'Current ability'], [[s[k] for k in ['name', 'kind', 'requires', 'effect']] for s in DATA['synergies']], [30, 22, 58, 90])
sheet('Notebook Perks', ['Perk', 'Current ability', 'Maximum ranks', 'Scraps per rank', 'Rank one', 'Maximum-rank effect', 'Source'], [[p[k] for k in ['name', 'effect', 'maxRanks', 'costs', 'rankOne', 'atMax', 'source']] for p in DATA['notebook']], [28, 82, 18, 40, 55, 55, 22])
sheet('Mechanics', ['Mechanic or specialization', 'Current behavior', 'Source'], [[m[k] for k in ['name', 'effect', 'source']] for m in DATA['mechanics']], [34, 115, 34])
review = sheet('Retuning Review', ['Upgrade', 'Category', 'Current ability', 'Evidence', 'Initial priority', 'Rework idea — NOT implemented', 'Your rating (1–5)', 'Your notes', 'Decision', 'Next playtest'], [[r[k] for k in ['name', 'category', 'effect', 'evidence', 'priority', 'idea', 'playerRating', 'playerNotes', 'decision', 'nextTest']] for r in DATA['review']], [28, 26, 72, 22, 22, 95, 20, 75, 20, 65], editable=(7, 8, 9, 10))
rating = DataValidation(type='whole', operator='between', formula1=1, formula2=5, allow_blank=True)
rating.errorTitle = 'Use a rating from 1 to 5'
rating.error = '1 means always skip; 5 means usually take.'
rating.showErrorMessage = True
review.add_data_validation(rating)
rating.add(f'G2:G{review.max_row}')
decision = DataValidation(type='list', formula1='"Keep,Rework,Remove,Test first"', allow_blank=True)
review.add_data_validation(decision)
decision.add(f'I2:I{review.max_row}')
book.save(OUT)
check = load_workbook(OUT)
assert check['Run Upgrades'].max_row == len(DATA['upgrades']) + 1
assert check['Synergies'].max_row == len(DATA['synergies']) + 1
assert check['Notebook Perks'].max_row == len(DATA['notebook']) + 1
assert abs(check['Read Me']['B6'].value - 1 / 3) < 1e-10
assert len(check['Retuning Review'].data_validations.dataValidation) == 2
print(f'Saved and reopened {OUT}: {len(check.sheetnames)} sheets, {len(DATA["upgrades"])} review rows.')
