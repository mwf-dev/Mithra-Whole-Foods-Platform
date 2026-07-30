"use client"

import { MessageSquare, X, ArrowLeft } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface Message {
  id: string
  text: string
  isUser: boolean
}

interface FAQOption {
  question: string
  answer: string
}

const FAQ_OPTIONS: FAQOption[] = [
  {
    question: "Delivery & Shipping Times",
    answer: "We prepare and dispatch all orders within 24 hours. Local delivery usually takes 1-2 business days, while domestic shipping takes 2-4 business days.",
  },
  {
    question: "Supported Payment Methods",
    answer: "We accept all major credit and debit cards securely through Stripe. We also support PayPal (both accounts and guest card checkouts), as well as Cash on Delivery (COD) in select areas.",
  },
  {
    question: "Returns & Refund Policy",
    answer: "For quality concerns regarding fresh grocery items, please report to us within 24 hours of delivery for a replacement or refund. Non-perishable items can be returned within 7 days.",
  },
]

const DEFAULT_WHATSAPP_NUMBER = "16102023456" // +1 (610) 202-3456 properly formatted
const WHATSAPP_TEXT = encodeURIComponent("Hello Mithra Whole Foods! I have a question about my order.")

const WhatsAppIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.464L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.59 2.002 14.124.95 11.5.95c-5.437 0-9.862 4.371-9.866 9.8.001 1.765.485 3.36 1.446 4.811L2.09 20.3l4.557-1.146z" />
    <path d="M17.487 14.402c-.302-.152-1.787-.882-2.057-.98-.27-.1-.466-.151-.663.144-.196.295-.76.953-.93 1.15-.17.195-.341.22-.643.069-.302-.153-1.274-.469-2.427-1.496-.897-.802-1.503-1.792-1.68-2.096-.177-.302-.019-.465.132-.615.136-.135.302-.35.454-.525.152-.175.203-.3.303-.5.101-.2.05-.375-.025-.526-.075-.152-.663-1.6-.909-2.193-.24-.576-.482-.497-.663-.506-.172-.008-.371-.01-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.787-.732 2.04-1.438.253-.706.253-1.314.177-1.439-.076-.124-.27-.199-.573-.35z" />
  </svg>
)

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hi there! Welcome to Mithra Whole Foods support. How can we help you today?",
      isUser: false,
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [showFAQs, setShowFAQs] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Retrieve configurable WhatsApp number from environment or fallback user-defined number
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${WHATSAPP_TEXT}`

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      // Delay slightly to allow chat box animation/rendering to finish
      setTimeout(scrollToBottom, 50)
    }
  }, [messages, isOpen, isTyping, showFAQs])

  const handleOptionClick = (option: FAQOption) => {
    // Hide FAQs from message area once selection is made
    setShowFAQs(false)

    // 1. Add User message
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      text: option.question,
      isUser: true,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    // 2. Simulate typing delay
    setTimeout(() => {
      const botMsg: Message = {
        id: Math.random().toString(36).substring(7),
        text: option.answer,
        isUser: false,
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 600)
  }

  const handleResetFAQs = () => {
    setShowFAQs(true)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window Panel */}
      {isOpen && (
        <div className="mb-4 flex h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl transition-all duration-300 ease-in-out sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <MessageSquare size={20} className="text-white" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-primary bg-green-400" />
              </div>
              <div>
                <h3 className="font-playfair text-lg font-bold leading-tight">Mithra Support</h3>
                <span className="text-xs text-white/80">Typically replies instantly</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 transition-colors hover:bg-white/10"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages List Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                      msg.isUser
                        ? "bg-primary text-white rounded-br-none shadow-sm"
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-none border border-gray-100 bg-white p-3 text-gray-500 shadow-sm">
                    <span className="flex gap-1 items-center py-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    </span>
                  </div>
                </div>
              )}

              {/* FAQ Buttons Rendered directly in Chat stream for maximum space usage */}
              {showFAQs && !isTyping && (
                <div className="mt-2 flex flex-col gap-2 bg-white/70 border border-gray-100/80 rounded-2xl p-3 shadow-sm">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Frequently Asked Questions
                  </span>
                  <div className="flex flex-col gap-2">
                    {FAQ_OPTIONS.map((opt, index) => (
                      <button
                        key={index}
                        onClick={() => handleOptionClick(opt)}
                        className="w-full text-left rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-medium text-gray-700 transition-all hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-[0.99]"
                      >
                        {opt.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Show return to FAQ button when scroll space is cleared */}
              {!showFAQs && !isTyping && (
                <div className="mt-1 flex justify-start">
                  <button
                    onClick={handleResetFAQs}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800"
                  >
                    <ArrowLeft size={12} />
                    <span>Ask another question</span>
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Direct Contact Footer - Streamlined to give maximum space to scroll area */}
          <div className="border-t border-gray-100 p-4 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-green-500 font-semibold text-white transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 active:scale-[0.98]"
            >
              <WhatsAppIcon />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl transition-transform hover:scale-105 active:scale-95 focus:outline-none"
        aria-label="Open support chat"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  )
}
