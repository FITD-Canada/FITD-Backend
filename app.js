import express from 'express';
import cors from 'cors';
import config from './config/index';
import mongoose from 'mongoose';
import hpp from 'hpp';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import cookieParser from 'cookie-parser';

// Routes
import userRoutes from './routes/api/user';
import contentRoutes from './routes/api/content';
import reviewRoutes from './routes/api/review';
import searchRoutes from './routes/api/search';
import categoryRoutes from './routes/api/category';

//=================================
//            App
//Author: Aiden Kim, Donghyun(Dean) Kim
//=================================

const app = express();
app.use(cookieParser());
const { MONGO_URI } = config;
app.use(hpp());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true, preFlightContinue: true }));
app.use(morgan('dev'));
app.use(express.json());

//Connect MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('MongoDB connected!'))
  .catch(err => {
    throw err;
  });

// Use routes
app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/category', categoryRoutes);

export default app;
