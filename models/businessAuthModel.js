const  mongoose = require("mongoose");
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Business = require('../models/businessModel');

const businessAuthSchema = new mongoose.Schema({
  BusinessName: {
    type: String,
    required: [true, 'Business Name cannot be empty!']
  },
  BusinessEmail: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']    
  },
  BusinessPhoneNumber: {
    type: String,
    unique: true,
    validate: [validator.isMobilePhone, 'Please provide a valid number']    
  },
  BusinessAddress: {
    type: String,
    unique:true,
    required: [true, 'Business Address cannot be empty!']
  },
  BusinessPostcode: {
    type: String,
    required: [true, 'Please provide your postcode'],
    uppercase: true,
    // validate: [validator.isPostalCode, 'Please provide a valid postcode'] 
  },
  BusinessPassword: {
    type: String ,
    required: [true, 'Password cannot be empty!'],
    minlength: 8,
    select: false
  },
  ConfirmBusinessPassword: {
    type: String ,
    required: [true, 'Confirm Password cannot be empty!'],
    // Below validation only works with create and save
    validate: {
      validator: function(el) {
        return el === this.BusinessPassword
      },
      message: 'Passwords are not the same!'
    }
  },
  role: {
    type: String,
    // enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'admin'
  },
  deletionDate: {
    type: Number,
    default: null,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },

  businesses: [
    {
      type:mongoose.Schema.ObjectId,
      ref: 'Business'
    }
  ]
})

// businessAuthSchema.pre('save', async function(next) {
//   const businessPromises = this.business.map(async id => Business.findById(id));
//   this.business = await Promise.all(businessPromises);
//   next();
// });



businessAuthSchema.pre('save', async function(next) {

  // Only run this function if the Password was modified
  if(!this.isModified('BusinessPassword')) return next();

  // Hash the Password with cost of 12
  this.BusinessPassword = await bcrypt.hash(this.BusinessPassword, 12);

  // Delete ConfirmPassword field
  this.ConfirmBusinessPassword = undefined

  next()
})

businessAuthSchema.pre('save', function(next) {
  if (!this.isModified('BusinessPassword') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});


businessAuthSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'businesses'
  })
  next()
});

businessAuthSchema.post(/^find/, function(docs, next) {
  console.log( `Query took ${Date.now() - this.start} milliseconds!`)
  next();
});



// businessAuthSchema.pre(/^find/, function(next) {
//   // this points to the current query
//   this.find({ active: { $ne: false } });
//   next();
// });


businessAuthSchema.methods.correctPassword = async function(candidatePassword, BusinessPassword) {
  return await bcrypt.compare(candidatePassword, BusinessPassword)
}

businessAuthSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp > changedTimestamp;
  }

  // False means NOT changed
  return false;
};

businessAuthSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const BusinessAuth = mongoose.model('BusinessAuth', businessAuthSchema)

module.exports = BusinessAuth;