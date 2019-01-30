#!/usr/bin/env node

'use strict';

const fs = require('fs');
require('dotenv').config(`${process.cwd}/.env`);

const cloudFormationTemplate = `AWSTemplateFormatVersion: 2010-09-09
Parameters:
  ProjectSource:
    Type: String
    Default: ${process.env.AWS_GITHUB_URL}
    Description: "Source control URL (e.g. Github)"
  GithubOwner:
    Type: String
    Default: ${process.env.AWS_GITHUB_USER}
  GithubRepo:
    Type: String
    Default: ${process.env.AWS_GITHUB_REPO}
  GithubOAuthToken:
    Type: String
    Default: ${process.env.AWS_GITHUB_TOKEN}
    Description: "Github personal access token"
Resources:
  CodePipeline:
    Type: 'AWS::CodePipeline::Pipeline'
    Properties:
      RoleArn: !GetAtt CodePipeLineRole.Arn
      ArtifactStore:
        Location: !Ref PipelineBucket
        Type: S3
      Stages:
        -
          Name: Source
          Actions:
            -
              Name: SourceAction
              ActionTypeId:
                Category: Source
                Owner: ThirdParty
                Provider: GitHub
                Version: 1
              OutputArtifacts:
                -
                  Name: ${process.env.AWS_APP}
              Configuration:
                Owner: !Ref GithubOwner
                Repo: !Ref GithubRepo
                Branch: master
                OAuthToken: !Ref GithubOAuthToken
        -
          Name: Build
          Actions:
            -
              Name: BuildAction
              ActionTypeId:
                Category: Build
                Owner: AWS
                Version: 1
                Provider: CodeBuild
              InputArtifacts:
                -
                  Name: ${process.env.AWS_APP}
              OutputArtifacts:
                -
                  Name: ${process.env.AWS_BUILD}
              Configuration:
                ProjectName: !Ref CodeBuild
  CodeBuildRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          -
            Effect: Allow
            Principal:
              Service:
                - "codebuild.amazonaws.com"
            Action:
              - "sts:AssumeRole"
      Path: /service-role/
      Policies:
        - PolicyName: root
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              -
                Effect: Allow
                Action:
                  - "s3:GetObject"
                  - "s3:GetObjectVersion"
                  - "s3:GetBucketVersioning"
                  - "s3:PutObject"
                Resource:
                  - !GetAtt PipelineBucket.Arn
                  - !Join ['', [!GetAtt PipelineBucket.Arn, "/*"]]
              -
                Effect: Allow
                Action:
                  - "s3:GetObject"
                  - "s3:GetObjectVersion"
                  - "s3:GetBucketVersioning"
                  - "s3:PutObject"
                  - "s3:PutObjectAcl"
                Resource:
                  - !GetAtt ${process.env.AWS_BUCKET}.Arn
                  - !Join ['', [!GetAtt ${process.env.AWS_BUCKET}.Arn, "/*"]]
              -
                Effect: Allow
                Action:
                  - "logs:CreateLogGroup"
                  - "logs:CreateLogStream"
                  - "logs:PutLogEvents"
                  - "cloudfront:CreateInvalidation"
                Resource:
                  - "*"
  CodePipeLineRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          -
            Effect: Allow
            Principal:
              Service:
                - "codepipeline.amazonaws.com"
            Action:
              - "sts:AssumeRole"
      Policies:
        - PolicyName: root
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              -
                Effect: Allow
                Action:
                  - "s3:GetObject"
                  - "s3:GetObjectVersion"
                  - "s3:GetBucketVersioning"
                  - "s3:PutObject"
                Resource:
                  - !GetAtt PipelineBucket.Arn
                  - !Join ['', [!GetAtt PipelineBucket.Arn, "/*"]]
              -
                Effect: Allow
                Action:
                  - "codebuild:BatchGetBuilds"
                  - "codebuild:StartBuild"
                Resource: "*"
  CodeBuild:
    Type: 'AWS::CodeBuild::Project'
    Properties:
      Name: !Sub \${AWS::StackName}-CodeBuild
      ServiceRole: !GetAtt CodeBuildRole.Arn
      Artifacts:
        Type: CODEPIPELINE
        Name: ${process.env.AWS_PROJECT}
      Source:
        Type: CODEPIPELINE
      Environment:
        ComputeType: BUILD_GENERAL1_SMALL
        Type: LINUX_CONTAINER
        Image: "aws/codebuild/nodejs:8.11.0"
      Source:
        Type: CODEPIPELINE
        BuildSpec: !Sub |
          version: 0.1
          phases:
            pre_build:
              commands:
                - echo Installing source NPM dependencies...
                - npm install
            build:
              commands:
                - echo Build started on \`date\`
                - npm run build
            post_build:
              commands:
                - aws s3 cp --recursive --acl public-read ./build s3://\${${process.env.AWS_BUCKET}}/
                - aws s3 cp --acl public-read --cache-control="max-age=0, no-cache, no-store, must-revalidate" ./build/service-worker.js s3://\${${process.env.AWS_BUCKET}}/
                - aws s3 cp --acl public-read --cache-control="max-age=0, no-cache, no-store, must-revalidate" ./build/index.html s3://\${${process.env.AWS_BUCKET}}/
                - aws cloudfront create-invalidation --distribution-id \${Distribution} --paths /index.html /service-worker.js
          artifacts:
            files:
              - '**/*'
            base-directory: build
  PipelineBucket:
    Type: 'AWS::S3::Bucket'
    Properties: {}
  ${process.env.AWS_BUCKET}:
    Type: 'AWS::S3::Bucket'
    Properties:
      WebsiteConfiguration:
        IndexDocument: index.html
  Distribution:
    Type: "AWS::CloudFront::Distribution"
    Properties:
      DistributionConfig:
        Origins:
          -
            DomainName: !GetAtt ${process.env.AWS_BUCKET}.DomainName
            Id: !Ref ${process.env.AWS_BUCKET}
            S3OriginConfig:
              OriginAccessIdentity: ''
        DefaultRootObject: index.html
        Enabled: true
        DefaultCacheBehavior:
          MinTTL: 86400
          MaxTTL: 31536000
          ForwardedValues:
            QueryString: true
          TargetOriginId: !Ref ${process.env.AWS_BUCKET}
          ViewerProtocolPolicy: "redirect-to-https"
`;

fs.writeFile('./aws.yml', Buffer.from(cloudFormationTemplate), (err,data) => { 
  err ? console.error(err) : console.log('File Ready');
});
