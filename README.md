# AWS React Pipeline Builder

Builds a file called **aws.yml** that will build and deploy a React application to Cloudfront, from any github repository.

Once setup, AWS will automatically build and deploy your react application from your master branch at github.com to the AWS "CloudFront" service, making it publicly available. It will re-deploy on every check-in to master.

## Installation
```
npm install -g @code-fellows/aws-tools
```

## Usage
* Ensure that your react application is properly deployed at github
* From your development machine, change to the folder containing your application
* Once you have the environment variables set, issue the following command:
* `aws-react-yaml`
* The tool will construct a file called `aws.yml` in your project's root folder
* Login to your AWS account and go to the **Cloud Formation** tool and create a new stack
* Choose the "Upload" option and upload this aws.yml file
* Follow the on screen prompts
* It takes about :30 minutes the first time
* On subsequent pushes to your master branch, AWS will detect and deploy for you, usually in about 5 minutes

## Requirements
A react application sourced at github, with a valid `package.json` file

A "build" script command in your package.json which creates a `/build` folder in the root of your app.

This tool requires that that the following **enviornment variables** be set.

You may use a `.env` file to set them. If you do, then run this tool from the folder that contains the `.env` file

* `AWS_GITHUB_URL` -- The URL to the repository at github containing your application
* `AWS_GITHUB_REPO` -- The raw name of your repository
* `AWS_GITHUB_USER` -- Your github login id
* `AWS_GITHUB_TOKEN` -- A developer token from your github account that grants 'repo' access
* `AWS_APP` -- Unique Name for your app at AWS
* `AWS_BUILD` -- Unique Name for your build at AWS
* `AWS_BUCKET` -- Unique Bucket Name where your website will be sourced at AWS
* `AWS_PROJECT` -- Unique Name for your project at AWS

## Caveats/Notes

* DO NOT commit your .env file or the aws.yml files to your github repository.
  * They will contain your github token, which is forbidden to be uploaded publicly
* DO NOT commit your react app's 'build' folder. The AWS system will automatically generate the build for you.

