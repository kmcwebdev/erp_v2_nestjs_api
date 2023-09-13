export interface ERPHRV1User {
  employeeID: string;
  sr: string;
  name: string;
  firstName: string;
  middleName: string;
  lastName: string;
  nameSuffix: string;
  personalEmail: string;
  workEmail: string;
  contactNumber: string;
  position: string;
  group: string;
  groupId: number;
  client: string;
  clientId: string;
  hrbpEmail: string;
  payrollBankAccount?: string | null;
  payrollAccountNumber?: string | null;
}
