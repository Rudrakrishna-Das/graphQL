const { validationResult } = require("express-validator");

const fs = require("fs");
const path = require("path");

const POST = require("../models/post");
const USER = require("../models/user");
const io = require("../socket");

const helper = require("../helper/helper");

exports.getFeed = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const totalItems = await POST.find().countDocuments();
    const posts = await POST.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    if (!posts) {
      const error = new Error("Could not found any post");
      error.status = 404;

      throw error;
    }
    res.status(200).json({
      message: "got posts",
      posts,
      totalItems,
    });
  } catch (err) {
    helper.helper(err, next);
  }
};

exports.getContent = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new Error("Validation Error");
    error.status = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error("No image provided");
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title; //bodyParser.json() adding this when we getting the data
  const content = req.body.content;
  const imageUrl = req.file.path.replace("\\", "/");

  const post = new POST({
    title,
    imageUrl: imageUrl,
    content,
    creator: req.userId,
  });

  try {
    await post.save();
    const user = await USER.findById(req.userId);
    user.posts.push(post);
    await user.save();
    io.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });
    res.status(201).json({
      message: "post added",
      post: post,
      creator: { _id: user._id, name: user.name },
    });
  } catch (err) {
    helper.helper(err, next);
  }
};

exports.getSinglePost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await POST.findById(postId).populate("creator");

    if (!post) {
      const error = new Error("Could not found any post");
      error.status = 404;
      throw error;
    }

    res.status(200).json({ message: "post found", post });
  } catch (err) {
    helper.helper(err, next);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;

  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new Error("Validation Error");
    error.status = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;

  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    const error = new Error("No file picked.");
    error.statusCode = 422;
    throw error;
  }
  try {
    const post = await POST.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("Could not found any post");
      error.status = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId) {
      let error = new Error("Not Authorized");
      error.statusCode = 403;
      throw error;
    }

    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    post.title = title;
    post.content = content;
    post.imageUrl = imageUrl;

    const result = await post.save();

    io.getIO().emit("posts", { action: "update", post: result });
    res.status(200).json({ message: "post Updated", post: result });
  } catch (err) {
    helper.helper(err, next);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await POST.findById(postId);

    if (!post) {
      const error = new Error("Could not found any post");
      error.status = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      let error = new Error("Not Authorized");
      error.statusCode = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await POST.findByIdAndRemove(postId);
    const user = await USER.findById(req.userId);
    user.posts.pull(postId);

    await user.save();
    io.getIO().emit("posts", { action: "delete", post: postId });
    res.status(200).json({ message: "Post Deleted" });
  } catch (err) {
    helper.helper(err, next);
  }
};

const clearImage = (filePath) => {
  fs.unlink(filePath, (err) => console.log(err));
};

exports.getStatus = async (req, res, next) => {
  const userId = req.userId;
  try {
    const user = await USER.findById(userId);
    res.status(200).json({ status: user.status });
  } catch (err) {
    helper.helper(err, next);
  }
};

exports.updateStatus = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new Error("Validation Error");
    error.status = 422;
    throw error;
  }
  const status = req.body.status;

  try {
    const user = await USER.findById(req.userId);
    user.status = status;
    await user.save();

    res.status(200).json({ message: "Status Updated!" });
  } catch (err) {
    helper.helper(err, next);
  }
};
