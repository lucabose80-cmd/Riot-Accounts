import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXXuP4lIRVJpJ8iOVxhsNX1-hOts2s2Jg",
  authDomain: "riot-accounts-97c48.firebaseapp.com",
  projectId: "riot-accounts-97c48",
  storageBucket: "riot-accounts-97c48.firebasestorage.app",
  messagingSenderId: "454092046819",
  appId: "1:454092046819:web:a51d09c7db52b1c010e0d6",
  measurementId: "G-Y81LTPHMXT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createFakeShare() {
  try {
    const fakeAccRef = doc(collection(db, 'accounts'));
    await setDoc(fakeAccRef, {
      userId: "fake_user_123",
      ingameName: "Faker#SKT",
      server: "KR",
      loginName: "hideonbush",
      password: "fakepassword123",
      lol: {
        level: 853,
        rank: "Challenger",
        champions: []
      },
      valorant: {
        level: 42,
        rank: "Radiant",
        characters: []
      },
      tft: {
        rank: "Unranked"
      },
      notes: "Dies ist ein Fake-Account zum Testen der Share-Funktion!",
      mainRoles: ["Midlane"]
    });

    const shareRef = doc(collection(db, 'shared_links'));
    await setDoc(shareRef, {
      accountIds: [fakeAccRef.id],
      createdAt: Date.now()
    });

    console.log("SHARE_ID=" + shareRef.id);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

createFakeShare();
