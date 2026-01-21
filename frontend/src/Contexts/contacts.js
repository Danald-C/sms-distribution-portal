import { createContext, useContext } from "react";

const contactsContext = createContext();

export function useContacts() {
    return useContext(contactsContext);
}
