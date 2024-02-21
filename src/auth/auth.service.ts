/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { User } from './schema/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { ResetDto } from './dto/reset.dto';
import * as nodemailer from 'nodemailer';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PinDto } from './dto/pin.dto';
import { PasswordDto } from './dto/password.dto';

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
    return {
      token: this.jwtService.sign({ id: id }),
      username: user.name,
      email: user.email,
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
  async sendEmailUsingNodeMailer(email: string, id: ObjectId){
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

  ///////////////////////////////////////////////////////////////

  // sends user with pincode
  async resetPassword(resetDto: ResetDto) {
    try {
      const { email } = resetDto;
      console.log(email);
      const user = await this.userModel.findOne({ email: email });
      if (!user) {
        throw new NotFoundException('User with this email does not exist');
      }
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'gorayausman061@gmail.com',
          pass: 'wqgf vugp mlxd xwca',
        },
      });
      const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
      console.log(pinCode);
      const mailOptions = {
        from: 'gorayausman061@gmail.com',
        to: email,
        subject: 'Subject',
        text: 'your pin code is ' + pinCode,
      };
      await transporter.sendMail(mailOptions);
      const token = this.jwtService.sign({
        user: user._id,
        pin: pinCode,
      });
      return { token };
    } catch (err) {
      throw new NotImplementedException(
        'It seems server can not send email on this mail. Please try valid and verified email.',
      );
    }
  }
  // validate pin code
  async validatePinCode(pinDto: PinDto, req: any) {
    const { pin } = pinDto;
    const { pinCode } = req;
    if (pinCode || pin) {
      throw new BadRequestException();
    }
    if (pinCode !== pin) {
      throw new BadRequestException({}, 'Wrong pin code entered!');
    }
    return {
      error: false,
      message: 'You are being redirected to new password page!',
    };
  }
  // change password
  async changePassword(passwordDto: PasswordDto, req: any) {
    const { password } = passwordDto;
    const user = await this.userModel.findOne({ _id: req?.user?._id });
    if (!user) {
      throw new NotFoundException(
        'You are not member of this blog app. Please sign up first',
      );
    }
    const hash = await bcrypt.hash(password, 10);
    if (!hash) {
      throw new BadRequestException('Invalid password.');
    }
    user.password = hash;
    await user.save();
    return { message: 'Password changed' };
  }
}
