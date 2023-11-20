const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'A business must have a price']
  },
  // priceDiscount: {
  //   type: Number,
  //   validate: {
  //     validator: function (val) {
  //       // this only points to current doc on NEW document creation
  //       return val < this.price;
  //     },
  //     message: 'Discount price ({VALUE}) should be below regular price'
  //   }
  // },
  images: [String],
  business:
    {
    type: mongoose.Schema.ObjectId,
    ref: 'Business',
    required: [true, 'Service must belong to a business.']
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  deletionDate: {
    type: Number,
    default: null,
  },
},
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


serviceSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'business',
    select: 'business _id'
  })
  next()
});


const Service = mongoose.model('Service', serviceSchema);


module.exports = Service;

 