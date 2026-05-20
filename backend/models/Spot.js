const mongoose = require('mongoose');

const spotSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    budget: { type: String, required: true },
    desc: { type: String, default: '' },
    img: { type: String, default: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    tags: [{ type: String, enum: ['budget', 'vibe', 'open-late', 'study-friendly', 'date-spot'], default: [] }],
    isOpenLate: { type: Boolean, default: false },
    isStudyFriendly: { type: Boolean, default: false },
    isDateSpot: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Spot', spotSchema);