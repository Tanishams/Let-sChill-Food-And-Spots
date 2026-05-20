const express = require('express');
const router = express.Router();
const Hack = require('../models/Hack');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const hacks = await Hack.find().populate('postedBy', 'name profilePic').sort({ createdAt: -1 });
        res.json(hacks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get trending hacks (from this week, sorted by likes)
router.get('/trending/week', protect, async (req, res) => {
    try {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const trendingHacks = await Hack.find({ createdAt: { $gte: oneWeekAgo } })
            .populate('postedBy', 'name profilePic')
            .sort({ likes: -1 })
            .limit(10);
        res.json(trendingHacks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', protect, async (req, res) => {
    try {
        const { name, time, timeUnit, ingredients, steps, img } = req.body;
        const hack = await Hack.create({ name, time, timeUnit, ingredients, steps, img, postedBy: req.user._id });
        await hack.populate('postedBy', 'name profilePic');
        res.status(201).json(hack);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Like a hack
router.post('/:id/like', protect, async (req, res) => {
    try {
        const hack = await Hack.findById(req.params.id);
        if (!hack) return res.status(404).json({ message: 'Hack not found' });
        
        const alreadyLiked = hack.likes.includes(req.user._id);
        if (alreadyLiked) {
            hack.likes = hack.likes.filter(id => id.toString() !== req.user._id.toString());
        } else {
            hack.likes.push(req.user._id);
        }
        await hack.save();
        await hack.populate('postedBy', 'name profilePic');
        res.json(hack);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Save / unsave a hack to user's saved list
router.post('/:id/save', protect, async (req, res) => {
    try {
        const hack = await Hack.findById(req.params.id);
        if (!hack) return res.status(404).json({ message: 'Hack not found' });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const alreadySaved = user.savedHacks && user.savedHacks.find(id => id.toString() === req.params.id);
        if (alreadySaved) {
            user.savedHacks = user.savedHacks.filter(id => id.toString() !== req.params.id);
        } else {
            user.savedHacks = user.savedHacks || [];
            user.savedHacks.push(req.params.id);
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

// Edit a hack
router.put('/:id', protect, async (req, res) => {
    try {
        const hack = await Hack.findById(req.params.id);
        if (!hack) return res.status(404).json({ message: 'Hack not found' });
        if (hack.postedBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
        
        const { name, time, timeUnit, ingredients, steps, img } = req.body;
        hack.name = name || hack.name;
        hack.time = time !== undefined ? time : hack.time;
        hack.timeUnit = timeUnit || hack.timeUnit;
        hack.ingredients = ingredients !== undefined ? ingredients : hack.ingredients;
        hack.steps = steps !== undefined ? steps : hack.steps;
        hack.img = img || hack.img;
        
        await hack.save();
        await hack.populate('postedBy', 'name profilePic');
        res.json(hack);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const hack = await Hack.findById(req.params.id);
        if (!hack) return res.status(404).json({ message: 'Hack not found' });
        if (hack.postedBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
        await hack.deleteOne();
        res.json({ message: 'Hack removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
