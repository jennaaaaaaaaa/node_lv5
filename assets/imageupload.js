import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
//웹상이미지를 업로드 하기 위한 작업에 필요한 모듈
import axios from 'axios';

AWS.config.update({
   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
   region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const imageUploader = multer({
   storage: multerS3({
      s3: s3,
      bucket: 'hanghae-nodelv3',
      acl: 'public-read',
      key: function (req, file, cb) {
         const extension = path.extname(file.originalname);
         cb(null, `${Date.now().toString()}${extension}`);
      },
   }),
});

async function uploadWebImage(url, bucket, key) {
   const response = await axios.get(url, { responseType: 'arraybuffer' });
   const data = Buffer.from(response.data, 'binary');

   const params = {
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: response.headers['content-type'],
      ContentLength: response.data.length,
      ACL: 'public-read',
   };

   return s3.upload(params).promise();
}

export { imageUploader, uploadWebImage };
