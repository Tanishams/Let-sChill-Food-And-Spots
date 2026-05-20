# LetsChill

LetsChill is a student-based web application made for discovering budget-friendly chill spots and food hacks around Bangalore.  
Users can explore places, post their own recommendations, share recipes, save posts, and interact with the community.

The project is built using the MERN stack with authentication, MongoDB Atlas database integration, and a chatbot feature.

---

# Features

## User Authentication
- Signup and Login system
- JWT authentication
- Password encryption using bcrypt
- Persistent login using localStorage
- Logout functionality

---

# User Profile
Users can:
- Update profile name
- Change password
- Upload profile picture

---

# Chill Spots
Users can:
- Add new spots
- Upload images
- Add descriptions and budget details
- Add tags like:
  - Open Late
  - Study-Friendly
  - Date Spot

Each post displays:
- Poster name
- Time posted
- Likes
- Budget information

---

# Food Hacks / Recipes
Users can:
- Share recipes and food hacks
- Add ingredients and steps
- Upload food images
- Like and save hacks

---

# Social Features
- Like and unlike posts
- Save posts to wishlist
- Shared community feed
- Trending spots section

---

# Edit and Delete Posts
Users can only:
- Edit their own posts
- Delete their own posts

---

# Trending Spots
The app shows trending spots from the past 7 days based on likes.

---

# Filters
Users can filter spots based on:
- Budget
- Vibe
- Open Late
- Study-Friendly
- Date Spot

---

# Chatbot
LetsChill includes a chatbot called ChillBot.

The chatbot:
- Answers questions only about locations posted in the app
- Does not answer unrelated questions

---

# Timestamps
Every post shows relative time like:
- 5m ago
- 2h ago
- 3d ago

using MongoDB timestamps.

---

# Tech Stack

## Frontend
- HTML
- CSS
- JavaScript

## Backend
- Node.js

## Database
- MongoDB Atlas
- Mongoose

## Authentication
- JWT
- bcrypt.js

