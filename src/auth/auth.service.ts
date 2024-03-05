/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from './schema/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import * as nodemailer from 'nodemailer';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PinDto } from './dto/pin.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
    private cloudinary: CloudinaryService,
  ) {}
  // find user by email
  async findUserByEmail(email: string) {
    return await this.userModel.findOne({ email: email });
  }
  // check if password matches
  async compareHashes(pass: string, password: string) {
    return await bcrypt.compare(pass, password);
  }
  // this service signs token
  async assignToken(id: ObjectId, user: User) {
    console.log(user)
    return {
      token: this.jwtService.sign({ id: id.toString() },{expiresIn: "3d"}),
      user,
    };
  }
  // checking multer file is valid
  checkfileIsValid(file: Express.Multer.File) {
    if (!file) {
      return false;
    }
    return true;
  }
  // convert plain password to hash
  async hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }
  // create user in mongodb
  async createUser(
    name: string,
    username: string,
    email: string,
    role: string,
    userStatus: string,
    image: string,
    password: string,
  ) {
    return await this.userModel.create({
      username,
      name,
      email,
      password,
      role,
      image,
      userStatus,
    });
  }
  // host image on cludinary
  async hostFileOnCloundinary(file: Express.Multer.File) {
    const image = await this.cloudinary.uploadImage(file).catch((err) => {
      console.log(err);
      throw new BadRequestException(
        'File uploading failed. Please select valid file type',
      );
    });
    return image;
  }
  // checking if admin
  async verifyingAdmin(req: any) {
    if (req?.user?.role === 'admin') {
      return true;
    }
    return false;
  }
  // object id conversion
  convertID(id: string) {
    return new ObjectId(id);
  }
  // find user by id
  async findUserById(id: ObjectId) {
    return await this.userModel.findById(id);
  }
  // changing userStaus block -> unblock or vice versa
  async changeUserStatus(user: User) {
    return await this.userModel.findByIdAndUpdate(
      user._id,
      {
        userStatus: user.userStatus === 'unblock' ? 'block' : 'unblock',
      },
      { new: true },
    );
  }
  // send email using nodemailer
  async sendEmailUsingNodeMailer(email: string, id: ObjectId) {
    // transpoter object
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'gorayausman061@gmail.com',
        pass: 'wqgf vugp mlxd xwca',
      },
    });
    // generating 4-digit code
    const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    // mail options
    const mailOptions = {
      from: 'gorayausman061@gmail.com',
      to: email,
      subject: 'Subject',
      text: 'your pin code is ' + pinCode,
    };
    // sending email
    await transporter.sendMail(mailOptions);
    const token = this.jwtService.sign({
      user: id.toString(),
      pin: pinCode,
    });
    return token;
  }
  // validate pin
  validatePinCode(pinDto: PinDto, req: any) {
    const { pin } = pinDto;
    const { pinCode } = req;
    if (pinCode !== pin) {
      return false;
    }
    return {
      redirect: true,
      message: 'You are being redirected to new password page!',
    };
  }
  // update password service
  async changeUserPassword(id: ObjectId, password: string) {
    const user = await this.findUserById(id);
    user.password = password;
    return user.save();
  }
  async getAllUsers(req:any) {
    if(req?.user?.role == 'admin'){
      return await this.userModel.find({}, '-password');
    }else{
      return {message : "Only admin can access this route"}
    }
  };
}
