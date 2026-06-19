import { collection, doc, addDoc, updateDoc, getDocs, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RiotAccount } from '../types';

const ACCOUNTS_COLLECTION = 'accounts';

export const getUserAccounts = async (userId: string): Promise<RiotAccount[]> => {
  const q = query(collection(db, ACCOUNTS_COLLECTION), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiotAccount));
};

export const getAccountByShareId = async (shareId: string): Promise<RiotAccount | null> => {
  const q = query(collection(db, ACCOUNTS_COLLECTION), where("shareId", "==", shareId));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const docSnap = querySnapshot.docs[0];
  
  const data = docSnap.data();
  // Remove email for shared view
  delete data.email;
  
  return { id: docSnap.id, ...data } as RiotAccount;
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
