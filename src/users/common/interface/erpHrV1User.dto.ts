export interface ERPHRV1User {
  employeeID: string;
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  nameSuffix: string;
  personalEmail: string;
  workEmail: string;
  contactNumber: string;
  client: string;
  clientId: string;
  position: string;
  address: {
    line1: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  }[];
  account_Manager: string;
  billing_POC: string;
  poC_Email: string;
  poC_FirstName: string | null;
  poC_MiddleName: string | null;
  poC_LastName: string | null;
  poC_NameSuffix: string | null;
  poC_Position: string | null;
  poC_ContactNumber: string | null;
}
