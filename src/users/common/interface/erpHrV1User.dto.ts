export interface ERPHRV1User {
  employeeID: string;
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
  employeeCompensation: Compensation;
}

interface Compensation {
  basicMonthlySalary: number;
  deminimis: number;
  reimbursable: number;
  taxableAllowance: number;
  transpoAllowance: number;
  parkingAllowance: number;
  other: number;
  discretionaryFirmBonus: number;
  communicationAllowance: number;
  medicalAllowance: number;
  nightWorkIncentive: number;
  phoneAllowance: number;
}
