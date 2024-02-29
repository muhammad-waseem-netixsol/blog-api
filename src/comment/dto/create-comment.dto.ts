import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";


export class CreateCommentDto {
    @ApiProperty()
    @IsString({message: "Comment must be a string.."})
    @IsNotEmpty({message: "comment is required"})
    @MinLength(1)
    @MaxLength(100)
    comment:string 
    @ApiProperty()
    @IsNotEmpty()
    blog: string
}
