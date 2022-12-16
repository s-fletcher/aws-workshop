import { App, Fn, Names, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs'

export class MyStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        /**
         * Create the api gateway
         */
        const api = new apigatewayv2.CfnApi(this, 'Api', {
            protocolType: 'HTTP',
            name: Names.uniqueId(this),
        });

        /**
         * Create new default stage to deploy to
         */
        new apigatewayv2.CfnStage(this, 'Stage', {
            apiId: api.ref,
            stageName: '$default',
            autoDeploy: true,
        })

        /**
         * Create new IAM role
         */
        const role = new iam.ServicePrincipal('apigateway.amazonaws.com');

        /**
         * Create the lambda function (this is code that will run in a lambda)
         */
        const fn = new lambdaNodeJs.NodejsFunction(this, 'Function', {
            entry: 'src/handler.ts',
        });

        /**
         * Grant function permission to use api gateway
         */
        fn.grantInvoke(role);

        const integration = new apigatewayv2.CfnIntegration(this, 'Integration', {
            apiId: api.ref,
            integrationType: 'AWS_PROXY',
            integrationUri: Fn.join('', [
                'arn:',
                Fn.ref('AWS::Partition'),
                ':apigateway:',
                Fn.ref('AWS::Region'),
                ':lambda:path/2015-03-31/functions/',
                fn.functionArn,
                '/invocations',
            ]),
            integrationMethod: 'POST',
            payloadFormatVersion: '2.0',
        });

        /**
         * Create new route in api gateway
         */
        new apigatewayv2.CfnRoute(this, 'Route', {
            apiId: api.ref,
            routeKey: 'GET /hello-world',
            target: Fn.join('/', ['integrations', integration.ref])
        });
    }
}

const app = new App();
new MyStack(app, 'MyStack', {
    env: {
        region: 'us-east-1',
    },
});
