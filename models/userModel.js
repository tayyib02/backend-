const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  FirstName: {
    type: String,
    required: [true, 'First Name cannot be empty!']
  },
  LastName: {
    type: String,
    required: [true, 'Last Name cannot be empty!']
  },
  Email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  }, 
  Photo: String,
  Password: {
    type: String ,
    required: [true, 'Password cannot be empty!'],
    minlength: 8,
    select: false
  },
  ConfirmPassword: {
    type: String ,
    required: [true, 'Confirm Password cannot be empty!'],
    // Below validation only works with create and save
    validate: {
      validator: function(el) {
        return el === this.Password
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  deletionDate: {
    type: Number,
    default: null,
  },
  role: {
    type: String,
    default: 'user'
  },
},
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


userSchema.pre('save', async function(next) {

  // Only run this function if the Password was modified
  if(!this.isModified('Password')) return next();

  // Hash the Password with cost of 12
  this.Password = await bcrypt.hash(this.Password, 12);

  // Delete ConfirmPassword field
  this.ConfirmPassword = undefined

  next()
})

userSchema.pre('save', function(next) {
  if (!this.isModified('Password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// userSchema.pre(/^find/, function(next) {
//   // this points to the current query
//   this.find({ active: { $ne: false } });
//   next();
// });


userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
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

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// userSchema.index({ deletionDate: 1 }, { expireAfterSeconds: 0 });
// userSchema.index({ deletionDate: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { active: false } });


const User = mongoose.model('User', userSchema)



module.exports = User;