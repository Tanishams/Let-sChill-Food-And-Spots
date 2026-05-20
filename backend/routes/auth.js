const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'Email already registered' });
        const user = await User.create({ name, email, password });
        const populated = await User.findById(user._id).select('-password')
            .populate({ path: 'savedSpots', populate: { path: 'postedBy', select: 'name profilePic' } })
            .populate({ path: 'savedHacks', populate: { path: 'postedBy', select: 'name profilePic' } });
        res.status(201).json({ _id: populated._id, name: populated.name, email: populated.email, profilePic: populated.profilePic, token: generateToken(populated._id), savedSpots: populated.savedSpots, savedHacks: populated.savedHacks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('-password')
            .populate({ path: 'savedSpots', populate: { path: 'postedBy', select: 'name profilePic' } })
            .populate({ path: 'savedHacks', populate: { path: 'postedBy', select: 'name profilePic' } });
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });
        if (!(await User.findOne({ email }).then(u => u.matchPassword(password)))) return res.status(401).json({ message: 'Invalid email or password' });
        res.json({ _id: user._id, name: user.name, email: user.email, profilePic: user.profilePic, token: generateToken(user._id), savedSpots: user.savedSpots, savedHacks: user.savedHacks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.profilePic !== undefined) user.profilePic = req.body.profilePic;
        if (req.body.password && req.body.password.trim() !== '') user.password = req.body.password;
        const updated = await user.save();
        const populated = await User.findById(updated._id).select('-password')
            .populate({ path: 'savedSpots', populate: { path: 'postedBy', select: 'name profilePic' } })
            .populate({ path: 'savedHacks', populate: { path: 'postedBy', select: 'name profilePic' } });
        res.json({ _id: populated._id, name: populated.name, email: populated.email, profilePic: populated.profilePic, token: generateToken(populated._id), savedSpots: populated.savedSpots, savedHacks: populated.savedHacks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/me', protect, async (req, res) => {
    res.json({ _id: req.user._id, name: req.user.name, email: req.user.email, profilePic: req.user.profilePic, savedSpots: req.user.savedSpots, savedHacks: req.user.savedHacks });
});

module.exports = router;