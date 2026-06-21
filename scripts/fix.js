import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXXuP4lIRVJpJ8iOVxhsNX1-hOts2s2Jg",
  projectId: "riot-accounts-97c48"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

updateDoc(doc(db, "shared_links", "iQOiNO5KKRstoBcLpcfd"), {
  shareId: "iQOiNO5KKRstoBcLpcfd"
}).then(() => {
  console.log("Fixed!");
  process.exit(0);
}).catch(console.error);
