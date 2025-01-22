import { ContactControllerClient, CreateContactDto } from "../swagger/apexBridgeApiService";
import { tryCatchJsonByAction } from "../utils/fetchUtils";

export const submitContactFormAction = async (contactData: CreateContactDto) => {
  const client = new ContactControllerClient();
  const response = await tryCatchJsonByAction(() => client.submitContactForm(contactData));
  return response;
}