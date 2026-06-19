import { collection, doc, addDoc, updateDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { RiotAccount } from '../types';

const ACCOUNTS_COLLECTION = 'accounts';
const SHARED_LINKS_COLLECTION = 'shared_links';

export const getUserAccounts = async (userId: string): Promise<RiotAccount[]> => {
  const q = query(collection(db, ACCOUNTS_COLLECTION), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiotAccount));
};

export const createSharedLink = async (accountIds: string[]): Promise<string> => {
  const shareId = Math.random().toString(36).substring(2, 10);
  await addDoc(collection(db, SHARED_LINKS_COLLECTION), {
    shareId,
    accountIds
  });
  return shareId;
};

export const getSharedAccounts = async (shareId: string): Promise<RiotAccount[]> => {
  const linkQ = query(collection(db, SHARED_LINKS_COLLECTION), where("shareId", "==", shareId));
  const linkSnap = await getDocs(linkQ);
  
  if (linkSnap.empty) {
    // Check legacy shareId on accounts directly just in case
    const legacyQ = query(collection(db, ACCOUNTS_COLLECTION), where("shareId", "==", shareId));
    const legacySnap = await getDocs(legacyQ);
    if (legacySnap.empty) return [];
    
    const acc = legacySnap.docs[0].data();
    delete acc.email;
    return [{ id: legacySnap.docs[0].id, ...acc } as RiotAccount];
  }

  const accountIds: string[] = linkSnap.docs[0].data().accountIds || [];
  if (accountIds.length === 0) return [];

  // Since 'in' queries support max 10 elements, we can do it locally if user has many, 
  // but let's assume < 10 shared accounts or do multiple queries. 
  // For simplicity, we chunk it to 10 max or do individual fetches.
  const accounts: RiotAccount[] = [];
  
  // To avoid complex queries, let's just query each account directly by document id.
  // Actually, 'documentId' query works in firestore but requires FieldPath.documentId()
  // Since we don't have it imported easily, let's just fetch all accounts for the user?
  // No, we don't know the user. Let's do `where('__name__', 'in', accountIds)` chunks.
  
  // Quick workaround: Just fetch all accounts that have an ID in our list.
  // Firestore limit is 10 for 'in'.
  const chunks = [];
  for (let i = 0; i < accountIds.length; i += 10) {
    chunks.push(accountIds.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    // using documentId() string equivalent in firestore is '__name__'
    const q = query(collection(db, ACCOUNTS_COLLECTION), where('__name__', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(doc => {
      const acc = doc.data();
      delete acc.email; // Hide email
      accounts.push({ id: doc.id, ...acc } as RiotAccount);
    });
  }

  return accounts;
};

export const createAccount = async (account: Omit<RiotAccount, 'id'>) => {
  const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), account);
  return docRef.id;
};

export const updateAccount = async (id: string, data: Partial<RiotAccount>) => {
  const docRef = doc(db, ACCOUNTS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteAccount = async (id: string) => {
  const docRef = doc(db, ACCOUNTS_COLLECTION, id);
  await deleteDoc(docRef);
};
