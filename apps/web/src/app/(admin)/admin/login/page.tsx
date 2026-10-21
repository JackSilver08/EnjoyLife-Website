import {redirect} from "next/navigation";
// There is only one login UI for customers and local development administrators.
export default function LegacyAdminLogin(){redirect("/account")}
