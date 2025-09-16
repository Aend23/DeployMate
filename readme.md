**DeployMate** is a full-stack web application designed to automate the deployment of GitHub repositories. Users can log in via GitHub, configure build settings, and deploy projects effortlessly using AWS infrastructure. DeployMate provides real-time feedback on build logs and serves the deployed application via AWS CloudFront.

## About
DeployMate simplifies the process of deploying web applications by integrating GitHub for repo selection and AWS services for building and hosting. The platform allows users to:
- Authenticate via GitHub OAuth.
- Configure project settings such as the source directory, branch, custom build/install commands, and environment variables.
- Automatically deploy projects using AWS ECS, Docker, and S3.
- View real-time deployment logs directly within the app.
- Serve the deployed project through CloudFront for fast content delivery.

## Features

- **GitHub OAuth Login**: Users can sign in using their GitHub accounts to easily integrate their repositories.
- **Custom Build Configurations**: Customize project settings like source directory, branch, build/install commands, and environment variables.
- **Real-Time Logs**: Monitor build progress with real-time logs streamed via Redis PubSub.
- **Automated Deployment Pipeline**: After configuration, projects are built and deployed using AWS SQS, Lambda, ECS, Docker, and S3.
- **Fast and Reliable Hosting**: Deployed projects are served through CloudFront for optimal performance.

##  Tech Stack

### Frontend:
- **React.js**
- **TailwindCSS**
- **ShadCN**
- **Redux**
- **TanStack Query**

### Backend:
- **Node.js**
- **Express**
- **PostgreSQL** (via Prisma)
- **Redis** (PubSub for real-time logs)
- **CassandraDB** (for persistent storage of deployment logs)

### DevOps and Cloud:
- **AWS S3** (for storing deployed projects)
- **AWS CloudFront** (for serving projects via CDN)
- **AWS Lambda** (for handling deployment triggers)
- **AWS ECS** (for running Docker containers to build projects)
- **AWS SQS** (for job queuing)
- **Docker** (for containerizing builds)

## 📞 Contact Me

If you have any questions or want to contribute to DeployMate, feel free to reach out:

- **Email**: [ankush122324@gmail.com](mailto:ankush122324@gmail.com)
- **GitHub**: [https://github.com/Aend23?tab=repositories](https://github.com/Aend23?tab=repositories)
---

**DeployMate** - Deploy faster, analyze smarter
