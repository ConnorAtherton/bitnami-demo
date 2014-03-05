var AWS = require('aws-sdk'),
    fs = require('fs');

var cloudformation,
    ec2,
    securityGroup,
    verified = false;

var init = function(params, callback) {

  //
  // I could clear the credentials in here
  //

  if(!params.accessKeyId || !params.secretAccessKey) {
    // return console.log('Credentials not complete');
    return callback('Please enter a valid key combination', null);
  }

  AWS.config.update({
    accessKeyId: params.accessKeyId,
    secretAccessKey: params.secretAccessKey,
    region: 'us-east-1',
    maxRetries: '15'
  });

  verified = true;

  // these instances will be shared by all
  // methods as they already contain the necessary
  // authentication
  cloudformation = new AWS.CloudFormation();
  ec2 = new AWS.EC2();

  console.log('init successful');

  // init successful so can we hand back to the callee to
  // launch the instance
  return callback(null, 'success');
}

function readInTemplate(templateName, stackName, callback) {
  fs.readFile(__dirname + '/templates/' + templateName + '.template', 'utf8', function (err,data) {
    if (err) {
      return callback(err, null);
    }
    // pass in the same callback to createStack
    // to carry on the chain
    createStack(data, stackName, callback);
  });
}

function createStack(template, stackName, callback) {

  var params = {
    StackName: stackName,
    TemplateBody: template,
  };

  cloudformation.createStack(params, function (err, data) {
    if (err) {
      return callback(err, null);
    } else {
      return callback(null, data);
    }
  });
};

function getStackInformation(stackName, callback) {

  var params = {
    StackName: stackName,
  };

  cloudformation.describeStacks(params, function(err, data) {
    if (err) {
      return callback(err, null);
    } else {
      return callback(null, data);
    };
  });
};

function deleteStack(stackName, callback) {

  var params = {
    StackName: stackName,
  };

  cloudformation.deleteStack(params, function(err, data) {
    if (err) {
      return callback(err, null);
    } else {
      return callback(null, data);
    };
  });
};

function launchInstanceSetup(description, name, callback) {
  // create security groups so server can accept incoming traffic
  securityGroup = createSecurityGroup(description, name, function(err, data) {
    if(err) return console.log(err);
    console.log('Created security group')

    // add some rules to the security group
    addSecurityRules(data, function(err, result) {
      if(err) return console.log(err);
      console.log('Added security rules')

      // using the security group we can now launch
      // the instance
      launchInstance(result, function(err, data) {
        if (err) {
          return callback(err, null);
        } else {
          return callback(null, data);
        };
      });
    });
  });
}

function launchInstance(securityGroup, callback) {
  console.log('securityGroup data is', securityGroup);

  var params = {
    // bitnami-cloud/wordpress/bitnami-wordpress-3.6.1-0-linux-ubuntu-12.04.2-x86_64-s3.manifest.xml
    //
    // found at
    //   https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#Images:filter=all-images;platform=ubuntu;visibility=public-images;search=Bitnami%20wordpress
    ImageId: 'ami-d5556dbc',
    InstanceType: 't1.micro',
    MinCount: 1,
    MaxCount: 1,
    Monitoring: {
      Enabled: true
    },
    SecurityGroupIds: [ securityGroup ],
  };

  ec2.runInstances(params, function(err, data) {
    console.log('launching the instance now...');
    if (err) return callback(err, null);

    console.log("Created instance", data.Instances[0].InstanceId);

    // only return the instanceId for now because that's all we need
    // to check the status. Come back later and return more data.
    // Initially thought I could return the DNS for the server
    // but it is null until running so have to check later.
    return callback(null, data.Instances[0].InstanceId);

  });
}

function stopInstance(instanceId, callback) {

  var params = {
    InstanceIds: [ instanceId ],
  };

  ec2.stopInstances(params, function(err, data) {
    if (err) {
      return callback(err, null);
    } else {
      return callback(null, data);
    };
  });
}

function createSecurityGroup(description, name, callback) {

  var params = {
    Description: description,
    GroupName: name
  };

  ec2.createSecurityGroup(params, function(err, data) {
    if (err) {
      return callback(err, null);
    } else {
      return callback(null, data);
    };
  });
}

function addSecurityRules(data, callback) {
  console.log('typeof groupId is', typeof data.GroupId, data.GroupId);
  var groupId = data.GroupId;

  //
  // Need to set IP permission on the group or the server
  // won't respond to any request. Just add SSH and HTTP
  // for now.
  //
  var params = {
    GroupId: data.GroupId,
    IpPermissions: [
        {
          IpProtocol: "tcp",
                FromPort: 22,
                ToPort: 22,
                IpRanges: [
                  {
                  CidrIp:"0.0.0.0/0"
                    }
                ]
         },
         {
          IpProtocol: "tcp",
                FromPort: 80,
                ToPort: 80,
                IpRanges: [
                  {
                  CidrIp:"0.0.0.0/0"
                    }
                ]
        }
    ]
  };

  ec2.authorizeSecurityGroupIngress(params, function(err, data) {
    if (err) {
      return callback(err, null);
    } else {
      // return the groupId here instead of usual returned data
      // so we can pass it to launch the instance
      console.log('groupId is still', groupId);
      return callback(null, groupId);
    };
  });
}

function checkInstanceStatus(instanceId, callback) {

  var params = {
    InstanceIds: [ instanceId ],
  };

  ec2.describeInstanceStatus(params, function(err, data) {
    if (err) {
      return callback(err, null);
    } else {
      return callback(null, data);
    };
  });
};

function getPublicDNS(instanceId, callback) {
  console.log('Getting the public DNS for ', instanceId);

  var params = {
    InstanceIds: [ instanceId ],
  };

  ec2.describeInstances(params, function(err, data) {
    if (err) {
      return callback(err, null);
    } else {
      return callback(null, data);
    };
  });
}


exports.init = init;
exports.createStack = readInTemplate;
exports.getStackInformation = getStackInformation;
exports.deleteStack = deleteStack;

exports.launchInstance = launchInstanceSetup;
exports.stopInstance = stopInstance;
exports.checkInstanceStatus = checkInstanceStatus;
exports.getPublicDNS = getPublicDNS;

