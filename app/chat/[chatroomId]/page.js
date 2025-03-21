'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import chatStyle from './chatroom.module.css'
import { CHATS_MSG, CHATS_ITEM, SEND_MSG, API_SERVER } from '@/config/api-path'
import { IoPerson } from 'react-icons/io5'
import moment from 'moment'
import io from 'socket.io-client'
// import { io } from 'socket.io-client'
export default function ChatRoomPage() {
  const params = useParams()
  const { auth, getAuthHeader } = useAuth()
  const { chatroomId } = params

  // const [user, setUser] = useState(0) //正在使用者
  const [error, setError] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [transport, setTransport] = useState('N/A')
  const [messages, setMessages] = useState([]) // 獲取聊天內容
  const [chatItem, setChatItem] = useState([]) //聊天室
  const [inputMsg, setInputMsg] = useState('') //正在輸入得文字內容
  const user = auth.id

  let socket
  socket = io('http://localhost:3006')
  useEffect(() => {
    socket.on('connect', () => {
      console.log('connect to ws server')
      setIsConnected(true)
    })
    // socket.on('message', (message) => {
    //   setMessages((pre) => {
    //     return [...pre, JSON.parse(message)]
    //   })
    // })
    return () => {
      socket.disconnect()
    }
  }, [])

  // 連線聊天室
  useEffect(() => {
    const socket = io('http://localhost:3006')
    socket.on('connect', () => {
      setIsConnected(true)
      setTransport(socket.io.engine.transport.name)
      console.log('connect to ws server')
      // console.log(transport) polling
    })
    socket.on('message', (message) => {
      console.log('message: ' + message)
      setMessages((pre) => {
        return [...pre, JSON.parse(message)]
      })
    })
    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    // 獲取聊天室單一數據
    const fetchChatItem = async () => {
      try {
        const res = await fetch(`${CHATS_ITEM}/${chatroomId}`, {
          headers: { ...getAuthHeader() },
        })
        if (!res.ok) {
          setError('Failed to fetch chats')
        }
        const data = await res.json()
        setChatItem(data.data[0] || {})
      } catch (err) {
        setError(err.message || '獲取單一聊天室 Something went wrong')
      }
    }
    // 獲取聊天內容
    const fetchMsg = async () => {
      try {
        const res = await fetch(`${CHATS_MSG}/${chatroomId}`, {
          headers: { ...getAuthHeader() },
        })
        if (!res.ok) {
          setError('Failed to fetch chats messages')
        }
        const data = await res.json()
        setMessages(data.data || {})
      } catch (err) {
        setError(err.message || '獲取聊天內容Something went wrong')
      }
    }

    fetchChatItem()
    fetchMsg()
  }, [auth, getAuthHeader])

  // 按發送
  // const handleOnclickSend = () => {
  //   socket.emit('message', inputMsg)
  //   setMessages((prevMessages) => [
  //     ...prevMessages,
  //     { use: 'Me', message: inputMsg },
  //   ])
  //   setInputMsg('')
  // }
  const handleOnclickSend = async () => {
    if (inputMsg.trim() === '') return

    const messageData = {
      sender_id: user,
      chat_id: chatroomId,
      message: inputMsg,
    }
    const now = new Date()
    socket.emit('message', inputMsg)
    setMessages((prevMessages) => [
      ...prevMessages,
      { user: user, message: inputMsg, time: moment(now).format('HH:mm') },
    ])
    console.log(messageData)
    try {
      const res = await fetch(SEND_MSG, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      })

      if (res.ok) {
        // 發送後清空輸入框
        setInputMsg('')
      } else {
        setError('Failed to send message')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    }
  }

  return (
    <>
      <div className={chatStyle.tempbody}>
        <div className={chatStyle.chatContainer}>
          <div className={chatStyle.friendName}>
            <IoPerson /> &nbsp;
            {chatItem.user1_id == user
              ? chatItem.user2_name
              : chatItem.user1_name}
          </div>
          <div className={chatStyle.chatBox}>
            {/* 顯示消息 */}
            <div className={chatStyle.messages}>
              {messages?.length > 0 ? (
                messages?.map((message, index) => (
                  <div key={index}>
                    <div
                      className={`${chatStyle.message} ${
                        user == message.sender_id
                          ? chatStyle.sent
                          : chatStyle.received
                      }`}
                    >
                      {message.message}
                    </div>
                    <pre
                      className={chatStyle.time}
                      style={{
                        textAlign: user == message.sender_id ? 'right' : 'left',
                      }}
                    >
                      {moment(message.created_at).format('HH:mm')}
                    </pre>
                  </div>
                ))
              ) : (
                <div className={chatStyle.noMessages}>暫無消息</div>
              )}
            </div>

            {/* 用戶輸入區域 <button onClick={sendMessage}>發送</button>*/}
            <div
              className={chatStyle.inputArea}
              // onSubmit={(e) => {
              //   e.preventDefault()
              // }}
            >
              <input
                className={chatStyle.textInput}
                type="text"
                placeholder="輸入消息..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
              />

              <button onClick={handleOnclickSend}>發送</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
