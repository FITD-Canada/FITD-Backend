import express from 'express';
const router = express.Router();
import moment from 'moment';
import '@babel/polyfill';
import { isNullOrUndefined } from 'util';
import auth from '../../middleware/auth';
import { uploadS3, deleteImg } from '../../middleware/aws';

// Model
import Content from '../../models/content';
import User from '../../models/user';
import Category from '../../models/category';
import Review from '../../models/review';

//========================================
//         Content Apis
// Author: Aiden Kim, Donghyun(Dean) Kim
//========================================

/*
 *
 * @route   POST   api/content/image
 * @desc    upload image
 * @access  Private
 *
 */

router.post('/image', uploadS3.array('upload', 5), async (req, res, next) => {
  try {
    console.log(req.files.map(v => v.location));
    res.json({ uploaded: true, url: req.files.map(v => v.location) });
  } catch (e) {
    console.error(e);
    res.json({ uploaded: false, url: null });
  }
});

/*
 *
 * @route    POST   api/content/deleteimg
 * @desc     delete image in the aws S3
 * @access   Private
 *
 */

router.post('/deleteimg', deleteImg, async (req, res) => {
  try {
    res.json({ deleted: true });
  } catch (e) {
    console.error(e);
    res.json({ deleted: false });
  }
});

/*
 * @route     GET   api/content/
 * @desc      GET all contnets
 * @access    Public
 *
 */

router.get('/', async (req, res) => {
  try {
    const contents = await Content.find();
    res.json(contents);
  } catch (e) {
    console.error(e);
  }
});

/*
 * @route     POST   api/content/
 * @desc      Create a content
 * @access    Private
 *
 */

router.post('/', auth, uploadS3.none(), async (req, res, next) => {
  try {
    const { path, title, description, price, fileUrl, creator, category } =
      req.body;

    const newContent = await Content.create({
      path,
      title,
      description,
      price,
      fileUrl,
      creator: req.user.id,
      date: moment().format('MM-DD-YYYY hh:mm:ss'),
    });

    // find category from database
    const existedCategory = await Category.findOne({
      categoryName: category,
    });

    console.log(existedCategory, 'Find Result category');
    // the category does not exist in the database.
    if (isNullOrUndefined(existedCategory)) {
      // create new category
      const newCategory = await Category.create({
        categoryName: category,
      });
      // insert data into database
      await Content.findByIdAndUpdate(newContent._id, {
        // $push is that it can put addition value in the exist array
        $push: { category: newCategory._id },
      });
      await Category.findByIdAndUpdate(newCategory._id, {
        $push: { contents: newContent._id },
      });
      await User.findByIdAndUpdate(req.user.id, {
        $push: { contents: newContent._id },
      });

      // the category exist in the database
    } else {
      await Content.findByIdAndUpdate(newContent._id, {
        // For the content model, the category was found in a particular content model, so $push was not used.
        category: existedCategory._id,
      });
      await Category.findByIdAndUpdate(existedCategory._id, {
        $push: { contents: newContent._id },
      });
      await User.findByIdAndUpdate(req.user.id, {
        $push: { contents: newContent._id },
      });
    }
    return res.redirect(`/api/content/${newContent.path}`);
  } catch (e) {
    console.error(e);
  }
});

/*
 * @route     GET   api/content/:path
 * @desc      Get each content detail
 * @access    Public
 *
 */

router.get('/:path', async (req, res, next) => {
  try {
    const content = await Content.findOne(req.params.path)
      .populate('creator', 'name') // first value is path and second value is select
      .populate({ path: 'category', select: 'categoryName' });
    // .exec();
    content.views += 1;
    content.save();
    console.log(content);
    res.json(content);
  } catch (e) {
    console.error(e);
    next(e);
  }
});

/*
 * @route    GET api/content/:path/edit
 * @desc     Get content that need to be edited
 * @access   Private
 *
 */
router.get('/:path/edit', auth, async (req, res, next) => {
  try {
    const content = await Content.findOne(req.params.path).populate(
      'creator',
      'name'
    );
    res.json(content);
  } catch (e) {
    console.error(e);
  }
});

/*
 * @route    POST api/content/:path/edit
 * @desc     Edit Post
 * @access   Private
 *
 */
router.post('/:path/edit', auth, async (req, res, next) => {
  console.log(req, 'api/content/:path/edit');

  const {
    body: { path, title, description, price, fileUrl },
  } = req;

  try {
    const modified_content = await Content.findOneAndUpdate(
      path,
      {
        path,
        title,
        description,
        price,
        fileUrl,
        date: moment().format('MM-DD-YYYY hh:mm:ss'),
      },
      { new: true }
    );
    console.log(modified_content, 'edit modified');
    res.redirect(`/api/content/${modified_content.path}`);
  } catch (e) {
    console.error(e);
    next(e);
  }
});

/*
 * @route    Delete api/content/:path
 * @desc     Delete a content
 * @access   Private
 *
 */
router.delete('/:path', auth, async (req, res) => {
  const content = Content.findOne({ path: req.params.path });
  await Content.deleteMany({ _id: content._id });
  await Review.deleteMany({ content: content._id });
  await User.findByIdAndUpdate(req.user.id, {
    $pull: {
      contents: content._id,
      reviews: { content_id: content._id },
    },
  });
  const CategoryUpdateResult = await Category.findOneAndUpdate(
    { contents: content._id },
    { $pull: { contents: content._id } },
    { new: true }
  );

  if (CategoryUpdateResult.contents.length === 0) {
    await Category.deleteMany({ _id: CategoryUpdateResult });
  }
  return res.json({ success: true });
});

export default router;
