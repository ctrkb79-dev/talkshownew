
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onValue, remove, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { HistoryItem, Spotlight, ReportHistoryItem } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyBDdQCYcJbzy9S7YmQJf5ZXk7lLHNhBrGw",
  authDomain: "rakib79-1e5e9.firebaseapp.com",
  databaseURL: "https://rakib79-1e5e9-default-rtdb.firebaseio.com",
  projectId: "rakib79-1e5e9",
  storageBucket: "rakib79-1e5e9.firebasestorage.app",
  messagingSenderId: "87584401594",
  appId: "1:87584401594:web:843399db849acd0b1a3a83"
};

let db: any;
const isConfigured = !!firebaseConfig.apiKey;

if (isConfigured) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
}

const HISTORY_REF = 'transcription_history';
const SPOTLIGHTS_REF = 'spotlights';
const REPORT_HISTORY_REF = 'report_history';

export const subscribeToHistory = (callback: (data: HistoryItem[]) => void) => {
    if (!db) return () => {};
    const historyRef = ref(db, HISTORY_REF);
    return onValue(historyRef, (snapshot) => {
        const data = snapshot.val();
        const formattedList: HistoryItem[] = data ? Object.values(data) : [];
        formattedList.sort((a, b) => Number(b.id) - Number(a.id));
        callback(formattedList);
    });
};

export const subscribeToReportHistory = (callback: (data: ReportHistoryItem[]) => void) => {
    if (!db) return () => {};
    const reportRef = ref(db, REPORT_HISTORY_REF);
    return onValue(reportRef, (snapshot) => {
        const data = snapshot.val();
        const formattedList: ReportHistoryItem[] = data ? Object.values(data) : [];
        formattedList.sort((a, b) => Number(b.id) - Number(a.id));
        callback(formattedList);
    });
};

export const subscribeToSpotlights = (callback: (data: Spotlight[]) => void) => {
    if (!db) return () => {};
    const spotRef = ref(db, SPOTLIGHTS_REF);
    return onValue(spotRef, (snapshot) => {
        const data = snapshot.val();
        const formattedList: Spotlight[] = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        callback(formattedList);
    });
};

export const addHistoryItemToFirebase = async (item: HistoryItem) => {
    if (!db) return;
    try {
        await set(ref(db, `${HISTORY_REF}/${item.id}`), item);
    } catch (e) { console.error("Firebase Save Error", e); }
};

export const addReportHistoryToFirebase = async (item: ReportHistoryItem) => {
    if (!db) return;
    try {
        await set(ref(db, `${REPORT_HISTORY_REF}/${item.id}`), item);
    } catch (e) { console.error("Firebase Report Save Error", e); }
};

export const saveSpotlightsToFirebase = async (spotlights: Spotlight[]) => {
    if (!db) return;
    try {
        await set(ref(db, SPOTLIGHTS_REF), spotlights);
    } catch (e) { console.error("Firebase Spotlight Save Error", e); }
};

export const deleteHistoryItemFromFirebase = async (id: string) => {
    if (!db) return;
    try { await remove(ref(db, `${HISTORY_REF}/${id}`)); } catch (e) { console.error("Firebase Delete Error", e); }
};

export const deleteReportHistoryFromFirebase = async (id: string) => {
    if (!db) return;
    try { await remove(ref(db, `${REPORT_HISTORY_REF}/${id}`)); } catch (e) { console.error("Firebase Report Delete Error", e); }
};
