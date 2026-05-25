export interface SheetRow {
  estado: string;
  email: string;
  solicitadaPor: string;
  lineaPresupuestaria: string;
  marcaTemporal: string;
  mes: string;
  proyecto: string;
  nroOC: string;
  proveedor: string;
  monto: number;
  descripcion: string;
  rendirA: string;
  col13: string;
  col14: string;
  tipoDocumento: string;
  nroDocumento: string;
  rut: string;
  banco: string;
  numeroCuenta: string;
  correoProveedor: string;
  account: string;
  linkOC: string;
  linkFactura: string;
  fechaFactura: string;
  linkPago: string;
}

export type UserRole = 'admin' | 'viewer';

export interface UserMetadata {
  role: UserRole;
  linea_presupuestaria?: string;
}

export interface BudgetLine {
  codigo: string;          // 3-level code, e.g. "006-01-01"
  descripcion: string;     // budget item description
  presupuesto: number;     // budgeted amount in CLP
}
