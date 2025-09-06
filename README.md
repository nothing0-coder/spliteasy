SplitEasy: The Intelligent Settlement Platform - Detailed PRD
1. Vision & Strategy
The Problem: Managing shared finances for group activities is a significant source of social friction. It involves manual tracking, complex calculations to determine who owes whom, and awkward follow-ups for payment. Existing tools are often just digital ledgers, placing the burden of calculation and settlement on the user.

Our Vision: SplitEasy is not just a ledger; it's an automated and intelligent platform that manages the entire lifecycle of a shared financial event. It is designed to be the single source of truth that makes group expenses transparent, fair, and incredibly simple to settle.

Core Principles:

Security First: User data and financial information are protected at every layer.

Seamless User Experience: The interface will be intuitive, fast, and proactive, minimizing user effort.

Scalable & Reliable: The architecture is built on serverless technologies to ensure high availability and performance, whether for a group of 2 or 200.

2. Feature Deep Dive: Core MVP (Must-Have Functionality)
This section details the essential features required to deliver the core value of SplitEasy.

Feature 2.1: Secure User Authentication
User Story: "As a new user, I want to sign up or log in instantly using my Google account or a secure email link, so I can start using the app without the friction of creating and remembering a new password."

Functional Requirements:

Users can sign on with a single click via Google OAuth.

Users can sign on by entering their email to receive a secure "magic link."

Upon successful authentication, users are redirected to their main dashboard.

The user's session is securely maintained across browser sessions.

Technical Implementation:

Backend: We will use Supabase Auth, which securely handles the entire OAuth 2.0 flow with Google and the token generation for magic links.

Database: A profiles table is automatically populated with a new user's ID and name via a PostgreSQL TRIGGER on the auth.users table.

Frontend: The UI is built in the app/(auth)/login route group. The LoginForm.tsx component handles the UI and user input. The actual authentication calls (signInWithOAuth, signInWithOtp) are made to the Supabase client library. A server-side app/auth/callback/route.ts handles the redirect from the auth provider to create a user session.

Feature 2.2: The Balances Engine
User Story: "As a group member, I want to see a clear, real-time summary of my financial position within the group at a glance, so I know instantly if I owe money or if others owe me."

Functional Requirements:

The group detail page must display a list of all members.

Next to each member, their net balance is shown (e.g., +₹550.00 or -₹230.00).

Positive balances (money owed to the user) are displayed in green with clarifying text like "gets back."

Negative balances (money the user owes) are displayed in red with text like "owes."

Zero balances are clearly marked as "settled up."

Technical Implementation:

Backend: We will create a Next.js Server Action called getGroupBalances. This secure, server-side function will:

Receive a groupId.

Verify the current user is a member of that group.

Execute a single, efficient SQL query that joins profiles, expenses, and expense_participants.

For each user, it calculates SUM(paid) - SUM(share) using PostgreSQL aggregate functions to determine their final balance.

Frontend: A new client component, GroupBalances.tsx, will call this server action. It will handle the loading state (e.g., showing a skeleton UI) and then render the list of balances with conditional styling based on the returned data.

Feature 2.3: The Debt Simplification Algorithm
User Story: "As the person organizing a trip, I want the app to automatically calculate the simplest way for everyone to get paid back, so we can avoid a confusing chain of multiple small payments."

Functional Requirements:

A group admin can initiate a "Settle Up" process.

The system will present a simplified payment plan (e.g., "Priya pays Rohan ₹500" instead of Priya -> Bob -> Rohan).

The plan must be mathematically correct and result in all balances becoming zero.

Technical Implementation:

Backend: This is a pure algorithmic function within a Server Action. It will take the list of balances (from the Balances Engine) as input.

It creates two lists: users with positive balances (creditors) and users with negative balances (debtors).

It then uses a greedy algorithm to match the largest debtor with the largest creditor, creating a transaction.

It updates their balances, removes anyone who is now settled, and repeats the process until all balances are zero.

The output is a simple array of transaction objects: [{ from: 'user_id', to: 'user_id', amount: 500 }]. This is a highly impressive feature for a portfolio project.

Feature 2.4: UPI Payment Integration & Real-Time Tracking
User Story: "As a user who owes money, I want a 'Pay with UPI' button that opens my payment app with all details pre-filled, so I can pay my debt in a single click without manually entering details."

Functional Requirements:

In the settlement plan, each pending payment has a "Pay with UPI" button.

Clicking the button launches the user's default UPI application (GPay, PhonePe, etc.) on their device.

The UPI app is pre-filled with the recipient's UPI ID and the exact amount.

After payment, the status in the SplitEasy app updates automatically from "Pending" to "Paid" for everyone in the group to see.

Technical Implementation:

Frontend: The "Pay" button will be a link (<a> tag) with an href formatted as a UPI deep link: upi://pay?pa=recipient@upi&pn=RecipientName&am=150.00&cu=INR.

Backend: We will create a Supabase Edge Function that serves as a secure webhook endpoint. We would configure a payment gateway to send a confirmation to this endpoint when a payment is completed.

Upon receiving a valid confirmation, the Edge Function will update the is_settled status in the expense_participants table.

Real-time: We will use Supabase Realtime to listen for changes in the database. When a payment is marked as paid, the change is pushed instantly to all connected clients, and the UI updates for everyone in the group without needing a page refresh.

3. Feature Deep Dive: Advanced Enhancements (To Be Added Last)
These features will be added after the core MVP is complete to elevate the application to a truly exceptional level.

Feature 3.1: Advanced Split Options
User Story: "As someone who paid for groceries, I want to split the bill by exact amounts for each person's items, not just equally, so the split is perfectly fair."

Functional Requirements: The "Add Expense" form will have a dropdown to select a split method: "Equally," "By Exact Amounts," "By Percentage," or "By Shares." The UI will change dynamically to allow input for the chosen method.

Technical Implementation: This will require a more complex AddExpenseForm component with conditional logic. The addExpense server action will need to be updated to handle the different split calculations and create the expense_participants entries accordingly.

Feature 3.2: OCR Receipt Scanning
User Story: "After a group dinner, I want to simply take a photo of the long, complicated bill and have the app figure out the total, so I don't have to manually type it in."

Functional Requirements: An "Add from Receipt" button that opens the device camera or gallery. After uploading a photo, the "Add Expense" form is pre-filled with the detected total amount and a suggested description.

Technical Implementation:

Frontend: An upload interface that sends the image file to the backend.

Backend: We'll use Supabase Storage to store the uploaded receipt image. This upload will trigger a Supabase Edge Function.

The Edge Function will securely call a third-party AI service like Google Cloud Vision AI's OCR API, sending it the image URL.

It will then parse the text response from the AI to find the total amount and merchant name, and update the database.
