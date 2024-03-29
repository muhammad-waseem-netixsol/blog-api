import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { LogInDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { ResetDto } from './dto/reset.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { PinDto } from './dto/pin.dto';
import { PasswordDto } from './dto/password.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('/signup')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        role: { type: 'string' },
        userStatus: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'THIS SIGNS YOU UP' })
  @ApiResponse({ status: 200, description: 'SUCCESSFULL' })
  @ApiResponse({ status: 404, description: 'BAD REQUEST' })
  @UseInterceptors(FileInterceptor('file'))
  async signUp(
    @Body() signUpDto: SignUpDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // checking file
    const fileIsValid = this.authService.checkfileIsValid(file);
    if (!fileIsValid) {
      throw new BadRequestException('File is required!');
    }
    // image on cloud
    const image = await this.authService.hostFileOnCloundinary(file);
    // checking user
    const { email } = signUpDto;
    const userExists = await this.authService.findUserByEmail(email);
    if (userExists) {
      throw new ConflictException(
        'User already exists. Please try different email.',
      );
    }
    // hashing password using bcrypt
    const { password, name, userStatus, username, role } = signUpDto;
    const hash = await this.authService.hashPassword(password);
    const user = await this.authService.createUser(
      name,
      username,
      email,
      role,
      userStatus,
      image.secure_url,
      hash,
    );
    return { user };
  }

  // login controller
  @Post('/login')
  @ApiOperation({ summary: 'THIS LOGS YOU IN' })
  @ApiResponse({ status: 200, description: 'SUCCESSFULL' })
  @ApiResponse({ status: 404, description: 'BAD REQUEST' })
  async logIn(
    @Body() logInDto: LogInDto,
  ) {
    const { email } = logInDto;
    // verify user
    const userExists = await this.authService.findUserByEmail(email);
    if (!userExists) {
      throw new NotFoundException('User not found. Please sign up first.');
    }
    // compare password
    const { password } = logInDto;
    const validatePassword: boolean = await this.authService.compareHashes(
      password,
      userExists.password,
    );
    if (!validatePassword) {
      throw new ForbiddenException('invalid credentials!');
    }
    // assign jwt
    return await this.authService.assignToken(userExists._id, userExists);
    
  }

  @Get('/users')
  @ApiOperation({ summary: 'retruns all users' })
  @ApiResponse({ status: 200, description: 'SUCCESSFULL' })
  @ApiResponse({ status: 404, description: 'BAD REQUEST' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard())
  allUsers( @Req() req: any) {
    return this.authService.getAllUsers(req);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'USER STATUS' })
  @ApiResponse({ status: 200, description: 'SUCCESSFULL' })
  @ApiResponse({ status: 404, description: 'BAD REQUEST' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard())
  async changeUserStatus(@Param('userId') id: string, @Req() req: any) {
    // verifying admin
    const isAdmin = this.authService.verifyingAdmin(req);
    if (!isAdmin) {
      throw new UnauthorizedException('Only admin can block | unblock users.');
    }
    // converting string into object id
    const objId = this.authService.convertID(id);
    // finding user
    const user = await this.authService.findUserById(objId);
    if (!user) {
      throw new NotFoundException('User does not found!');
    }
    // changing user status
    const status = await this.authService.changeUserStatus(user);
    if (status) {
      return { message: `User has been ${status.userStatus}ed by Admin!` };
    }
  }

  @Post('/reset-password')
  @ApiOperation({ summary: 'RESET PASS' })
  @ApiResponse({ status: 200, description: 'SUCCESSFULL' })
  @ApiResponse({ status: 404, description: 'BAD REQUEST' })
  async resetPassword(@Body() resetDto: ResetDto) {
    const { email } = resetDto;
    const userExists = await this.authService.findUserByEmail(email);
    if (!userExists) {
      throw new NotFoundException('User does not exist. Try valid email.');
    }
    // sending email
    const emailSending = await this.authService.sendEmailUsingNodeMailer(
      email,
      userExists._id,
    );
    return {
      token: emailSending,
      message: 'Please check your email box and enter pin.',
    };
  }

  @Post('/validate-pin')
  @ApiOperation({ summary: 'VALIDATE PIN' })
  @ApiResponse({ status: 200, description: 'SUCCESSFULL' })
  @ApiResponse({ status: 404, description: 'BAD REQUEST' })
  validatepinCode(@Body() pinDto: PinDto, @Req() req: any) {
    return this.authService.validatePinCode(pinDto, req);
  }

  @Patch('/change-password')
  @ApiOperation({ summary: 'CHANGE PASSWORD' })
  @ApiResponse({ status: 200, description: 'SUCCESSFULL' })
  @ApiResponse({ status: 404, description: 'BAD REQUEST' })
  async changePassword(@Body() passwordDto: PasswordDto, @Req() req: any) {
    const id: ObjectId = req?.user?._id;
    const userExists = await this.authService.findUserById(id);
    if (!userExists) {
      throw new NotFoundException(
        'User with this email does not exist. Try valid email.',
      );
    }
    const { password } = passwordDto;
    const hash = await this.authService.hashPassword(password);
    const passChanged = await this.authService.changeUserPassword(id, hash);
    if (!passChanged) {
      return { message: 'Some error occurred. Try again later.' };
    }
    return { message: 'Password has been changed!' };
  }
  @Get('/verify-user')
  @ApiOperation({ summary: 'VALIDATE PIN' })
  @ApiResponse({ status: 200, description: 'SUCCESSFULL' })
  @ApiResponse({ status: 404, description: 'BAD REQUEST' })
  @UseGuards(AuthGuard())
  verifyUser(@Req() req: any) {
    if (req?.user) {
      return { user: req?.user };
    }
    return { unauthorized: true };
  }
}
