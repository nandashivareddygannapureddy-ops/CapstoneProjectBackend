import exp from 'express'
import { verifyToken } from '../middlewares/verifyTokens.js'
import { checkAuthor } from '../middlewares/checkAuthor.js'
import { UserTypeModel } from '../Models/UserModel.js'
export const  adminRoute=exp.Router()

//Authenticate admin
//Read all articles
//Block / unblock user roles
adminRoute.get('/users/:usersId',verifyToken,async(req,res)=>{
    let user=req.params.usersId
    let userOfDB=await UserTypeModel.findById(user)
     if (!userOfDB) {
    return res.status(401).json({ message: "User not found" });
  }
    await UserTypeModel.findByIdAndUpdate(user,{$set:{isActive:false}})
    res.status(200).json({message:"user blocked", payload:"userOfDB"})

})

//unblock the user
adminRoute.get('/users/:usersId',verifyToken,async(req,res)=>{
    let user=req.params.usersId
    let userOfDB=await UserTypeModel.findById(user)
     if (!userOfDB) {
    return res.status(401).json({ message: "User not found" });
  }
    await UserTypeModel.findByIdAndUpdate(user,{$set:{isActive:true}})
    res.status(200).json({message:"user unblocked"})

})