import {redirect} from "next/navigation";

// Old bookmarks should land on the new inline form, never on a separate page.
export default function LegacyContactPage() {
  redirect("/#contact");
}
