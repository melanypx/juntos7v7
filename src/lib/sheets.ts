import { google } from 'googleapis';
import type { SheetRow } from './types';

function parseMonto(value: string): number {
  if (!value) return 0;
  // Maneja formato chileno: "$ 1.234.567" o "1234567"
  const clean = value.replace(/[^0-9]/g, '');
  return parseInt(clean, 10) || 0;
}

export async function getSheetData(): Promise<SheetRow[]> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: process.env.GOOGLE_SHEET_RANGE ?? 'A:Y',
  });

  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];

  // La primera fila es el encabezado; la saltamos
  return rows.slice(1).map((row): SheetRow => ({
    estado:               row[0]  ?? '',
    email:                row[1]  ?? '',
    solicitadaPor:        row[2]  ?? '',
    lineaPresupuestaria:  row[3]  ?? '',
    marcaTemporal:        row[4]  ?? '',
    mes:                  row[5]  ?? '',
    proyecto:             row[6]  ?? '',
    nroOC:                row[7]  ?? '',
    proveedor:            row[8]  ?? '',
    monto:                parseMonto(row[9]),
    descripcion:          row[10] ?? '',
    rendirA:              row[11] ?? '',
    col13:                row[12] ?? '',
    col14:                row[13] ?? '',
    tipoDocumento:        row[14] ?? '',
    nroDocumento:         row[15] ?? '',
    rut:                  row[16] ?? '',
    banco:                row[17] ?? '',
    numeroCuenta:         row[18] ?? '',
    correoProveedor:      row[19] ?? '',
    account:              row[20] ?? '',
    linkOC:               row[21] ?? '',
    linkFactura:          row[22] ?? '',
    fechaFactura:         row[23] ?? '',
    linkPago:             row[24] ?? '',
  }));
}
