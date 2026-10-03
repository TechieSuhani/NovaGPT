import "./Sidebar.css";
import { useCallback, useContext, useEffect, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import logo from "./assets/blacklogo.png";
import {v1 as uuidv1} from "uuid";

function Sidebar() {
    const {allThreads, setAllThreads, currThreadId, setNewChat, setPrompt, setReply, setCurrThreadId, setPrevChats} = useContext(MyContext);
    const [isExpanded, setIsExpanded] = useState(false);

    const getAllThreads = useCallback(async () => {
        try {
            const response = await fetch("/api/thread");
            const res = await response.json();
            if (!response.ok) {
                throw new Error(res.error || "Could not load chat history.");
            }
            const filteredData = res.map(thread => ({threadId: thread.threadId, title: thread.title}));
            setAllThreads(filteredData);
        } catch(err) {
            console.error(err);
        }
    }, [setAllThreads]);

    useEffect(() => {
        getAllThreads();
    }, [currThreadId, getAllThreads]);


    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
        setIsExpanded(false);
    }

    const changeThread = async (newThreadId) => {
        setCurrThreadId(newThreadId);

        try {
            const response = await fetch(`/api/thread/${newThreadId}`);
            const res = await response.json();
            if (!response.ok) {
                throw new Error(res.error || "Could not load this conversation.");
            }
            setPrevChats(res);
            setNewChat(false);
            setReply(null);
            setIsExpanded(false);
        } catch(err) {
            console.error(err);
        }
    }   

    const deleteThread = async (threadId) => {
        try {
            const response = await fetch(`/api/thread/${threadId}`, {method: "DELETE"});
            const res = await response.json();
            if (!response.ok) {
                throw new Error(res.error || "Could not delete this conversation.");
            }

            //updated threads re-render
            setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));

            if(threadId === currThreadId) {
                createNewChat();
            }

        } catch(err) {
            console.error(err);
        }
    }

    return (
        <section className={`sidebar${isExpanded ? " sidebarExpanded" : ""}`}>
            <button
                className="sidebarToggle"
                type="button"
                aria-label={isExpanded ? "Close chat history" : "Open chat history"}
                aria-expanded={isExpanded}
                onClick={() => setIsExpanded((expanded) => !expanded)}
            >
                <i className={`fa-solid ${isExpanded ? "fa-xmark" : "fa-bars"}`}></i>
            </button>
            <button className="newChatButton" type="button" onClick={createNewChat} aria-label="Start a new chat">
                <img src={logo} alt="NovaGPT logo" className="logo"></img>
                <span><i className="fa-solid fa-pen-to-square"></i></span>
            </button>


            <ul className="history">
                {
                    allThreads?.map((thread, idx) => (
                        <li key={idx} 
                            onClick={() => changeThread(thread.threadId)}
                            className={thread.threadId === currThreadId ? "highlighted": " "}
                        >
                            {thread.title}
                            <i className="fa-solid fa-trash"
                                onClick={(e) => {
                                    e.stopPropagation(); //stop event bubbling
                                    deleteThread(thread.threadId);
                                }}
                            ></i>
                        </li>
                    ))
                }
            </ul>
 
            <div className="sign">
                <p>NovaGPT</p>
            </div>
        </section>
    )
}

export default Sidebar;