const mongoose = require('mongoose');

const hackSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    time: { type: Number, required: true },
    ingredients: { type: String, default: '' },
    steps: { type: String, default: '' },
    img: { type: String, default: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=800&q=80' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Hack', hackSchema);