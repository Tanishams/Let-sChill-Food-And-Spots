const express = require('express');
const router = express.Router();
const Spot = require('../models/Spot');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const spots = await Spot.find().populate('postedBy', 'name profilePic').sort({ createdAt: -1 });
        res.json(spots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get trending spots (from this week, sorted by likes)
router.get('/trending/week', protect, async (req, res) => {
    try {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const trendingSpots = await Spot.find({ createdAt: { $gte: oneWeekAgo } })
            .populate('postedBy', 'name profilePic')
            .sort({ likes: -1 })
            .limit(10);
        res.json(trendingSpots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Filter spots by tags/attributes
router.get('/filter/:tag', protect, async (req, res) => {
    try {
        const tag = req.params.tag;
        let query = {};
        
        if (tag === 'budget') query.budget = { $in: ['₹0-100', '₹100-300', '₹300-500'] };
        else if (tag === 'vibe') query.desc = { $exists: true, $ne: '' };
        else if (tag === 'open-late') query.isOpenLate = true;
        else if (tag === 'study-friendly') query.isStudyFriendly = true;
        else if (tag === 'date-spot') query.isDateSpot = true;
        
        const spots = await Spot.find(query)
            .populate('postedBy', 'name profilePic')
            .sort({ createdAt: -1 });
        res.json(spots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', protect, async (req, res) => {
    try {
        const { name, area, budget, desc, img, isOpenLate, isStudyFriendly, isDateSpot } = req.body;
        const spot = await Spot.create({ 
            name, area, budget, desc, img, postedBy: req.user._id,
            isOpenLate: isOpenLate || false,
            isStudyFriendly: isStudyFriendly || false,
            isDateSpot: isDateSpot || false
        });
        await spot.populate('postedBy', 'name profilePic');
        res.status(201).json(spot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Like a spot
router.post('/:id/like', protect, async (req, res) => {
    try {
        const spot = await Spot.findById(req.params.id);
        if (!spot) return res.status(404).json({ message: 'Spot not found' });
        
        const alreadyLiked = spot.likes.includes(req.user._id);
        if (alreadyLiked) {
            spot.likes = spot.likes.filter(id => id.toString() !== req.user._id.toString());
        } else {
            spot.likes.push(req.user._id);
        }
        await spot.save();
        await spot.populate('postedBy', 'name profilePic');
        res.json(spot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Save / unsave a spot to user's saved list
router.post('/:id/save', protect, async (req, res) => {
    try {
        const spot = await Spot.findById(req.params.id);
        if (!spot) return res.status(404).json({ message: 'Spot not found' });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const alreadySaved = user.savedSpots && user.savedSpots.find(id => id.toString() === req.params.id);
        if (alreadySaved) {
            user.savedSpots = user.savedSpots.filter(id => id.toString() !== req.params.id);
        } else {
            user.savedSpots = user.savedSpots || [];
            user.savedSpots.push(req.params.id);
        }

        await user.save();
        await user.populate([
            { path: 'savedSpots', populate: { path: 'postedBy', select: 'name profilePic' } },
            { path: 'savedHacks', populate: { path: 'postedBy', select: 'name profilePic' } }
        ]);
        res.json({ savedSpots: user.savedSpots, savedHacks: user.savedHacks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Edit a spot
router.put('/:id', protect, async (req, res) => {
    try {
        const spot = await Spot.findById(req.params.id);
        if (!spot) return res.status(404).json({ message: 'Spot not found' });
        if (spot.postedBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
        
        const { name, area, budget, desc, img, isOpenLate, isStudyFriendly, isDateSpot } = req.body;
        spot.name = name || spot.name;
        spot.area = area || spot.area;
        spot.budget = budget || spot.budget;
        spot.desc = desc !== undefined ? desc : spot.desc;
        spot.img = img || spot.img;
        spot.isOpenLate = isOpenLate !== undefined ? isOpenLate : spot.isOpenLate;
        spot.isStudyFriendly = isStudyFriendly !== undefined ? isStudyFriendly : spot.isStudyFriendly;
        spot.isDateSpot = isDateSpot !== undefined ? isDateSpot : spot.isDateSpot;
        
        await spot.save();
        await spot.populate('postedBy', 'name profilePic');
        res.json(spot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const spot = await Spot.findById(req.params.id);
        if (!spot) return res.status(404).json({ message: 'Spot not found' });
        if (spot.postedBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
        await spot.deleteOne();
        res.json({ message: 'Spot removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
