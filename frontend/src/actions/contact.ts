import { toast } from "react-toastify";
import { ContactControllerClient, CreateContactDto } from "../swagger/apexBridgeApiService";
import { ErrorResponse, tryCatchJsonByAction } from "../utils/fetchUtils";

export const submitContactFormAction = async (contactData: CreateContactDto) => {
  const client = new ContactControllerClient();
  const response = await tryCatchJsonByAction(() => client.submitContactForm(contactData), true);
  if (!(response instanceof ErrorResponse)) {
      toast.success('Email sent!')
  }
  return response;
}