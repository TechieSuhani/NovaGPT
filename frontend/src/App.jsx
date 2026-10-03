import './App.css';
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import {MyContext} from "./MyContext.jsx";
import { useEffect, useState } from 'react';
import {v1 as uuidv1} from "uuid";

function App() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]); //stores all chats of curr threads
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("novagpt-theme") || "dark");
  const [responseStyle, setResponseStyle] = useState(() => localStorage.getItem("novagpt-response-style") || "balanced");
  const [responseLanguage, setResponseLanguage] = useState(() => localStorage.getItem("novagpt-response-language") || "auto");
  const [plan, setPlan] = useState(() => localStorage.getItem("novagpt-plan") || "Free");

  useEffect(() => {
    localStorage.setItem("novagpt-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("novagpt-response-style", responseStyle);
  }, [responseStyle]);

  useEffect(() => {
    localStorage.setItem("novagpt-response-language", responseLanguage);
  }, [responseLanguage]);

  useEffect(() => {
    localStorage.setItem("novagpt-plan", plan);
  }, [plan]);

  const providerValues = {
    prompt, setPrompt,
    reply, setReply,
    currThreadId, setCurrThreadId,
    newChat, setNewChat,
    prevChats, setPrevChats,
    allThreads, setAllThreads,
    theme, setTheme,
    responseStyle, setResponseStyle,
    responseLanguage, setResponseLanguage,
    plan, setPlan
  }; 

  return (
    <div className={`app theme-${theme}`}>
      <MyContext.Provider value={providerValues}>
          <Sidebar></Sidebar>
          <ChatWindow></ChatWindow>
        </MyContext.Provider>
    </div>
  )
}

export default App