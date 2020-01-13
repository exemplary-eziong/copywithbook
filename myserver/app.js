//express 기본모듈
var express = require('express');
var http = require('http');
var path = require('path');

//express 미들웨어
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var static = require('serve-static');
var errorHandler = require('errorhandler');

//애러 핸들러 모듈 사용
var expressErrorHandler = require('express-error-handler');

//Session 미들웨어 불러오기
var expressSession = require('express-session');

//express 객체 생성
var app = express();

//기본 속성 설정
app.set('port',process.env.PORT || 3000);

//body-parser를 이용해 application/x-www-form-urlencoded 파싱
app.use(bodyParser.urlencoded({extended:false}));

//body-parser를 이용해 application/json 파싱
app.use(bodyParser.json());

//public 폴더를 static으로 오픈
app.use('/public',static(path.join(__dirname,'public')));

//cookie-parser 설정
app.use(cookieParser());

//view엔진 설정
app.set('view engine', 'ejs');
app.engine('html',require('ejs').renderFile);

//세션 설정
app.use(expressSession({
    secret:'my key',
    resave:true,
    saveUninitialized:true
}));

//====== 데이터베이스 연결 =======//

//몽고디비 모듈 사용
var MongoClient = require('mongodb').MongoClient;

//데이터베이스 객체를 위한 변수 선언
var database;

//데이터베이스에 연결
function connectDB(){
    //데이터베이스 연결 정보
    var databaseUrl = 'mongodb://localhost:27017/local';

    //데이터베이스 연결
    MongoClient.connect(databaseUrl,function(err,db){
        if (err) throw err;

        console.log('데이터베이스에 연결되었습니다. : '+databaseUrl);

        //database 변수에 할당
        database = db;
    });
};

//======= 라우팅 함수 등록 ========/


//라우터 객체 참조
var router = express.Router();

//라우터 객체 등록
app.use('/',router);



//인덱스 페이지 라우팅
app.get('/',function(req,res){
    res.redirect('/public/index.html');
})

//로그인 라우팅 함수 - 데이터베이스 정보와 비교
app.post('/process/login',function(req,res){
    console.log('/process/login 호출.')
    
    var paramId = req.body.id;
    var paramPassword = req.body.password;
    
    console.log(paramId + ', '+paramPassword+' 요청됨.')
    //데이터베이스 객체가 초기화된 경우, authUser 함수 호출하여 사용자 인증	
    if(database){
        authUser(database,paramId,paramPassword,function(err,docs){
            if(err){ throw err; }

            //조회된 레코드가 있으면 성공 응답 전송
            if(docs){
                console.dir(docs);

                console.log('-----------------')
                //조회 결과에서 사용자 이름 확인
                var username = docs[0].name;
                res.render('main');
                //res.end();
                
            }else{
                console.log('조회된 레코드가 없음');
                console.log('index.html페이지로 이동');
                res.redirect('/public/index.html');
            }
        })
    }else{//데이터베이스 연결 실패
        console.log('데이터베이스 연결에 실패했습니다.');
        res.redirect('/public/index.html');
    }
})


app.post('/process/signup',function(req,res){
    console.log('/process/signup 호출됨.');

    var paramId = req.body.id;
    var paramPassword = req.body.password;
    var paramCPassword = req.body.cpassword;
    var paramName = req.body.nickname;

    console.log('요청 파라미터 : ' + paramId + ', ' + paramPassword + ', '+ paramCPassword + ', ' + paramName)
    
    //데이터베이스 객체가 초기화된 경우, addUser 함수 호출하여 사용자 추가
    if(database){
        addUser(database,paramId,paramPassword,paramName,function(err,result){
            if(err){throw err;}

            // password와 cpassword가 다르면 redirect
            if(paramPassword != paramCPassword) {
                console.log('비밀번호 확인 필요!')
                res.redirect('/public/index.html');
            }
            // 결과 객체 확인하여 추가된 데이터 있으면 성공 응답 전송
            if(result && result.insertedCount > 0){
                console.dir(result);
                res.render('main');
                //res.end();
            }else{// 결과 객체가 없으면 실패 응답 전송
                console.log('사용자 추가 실패');
                res.redirect('/public/index.html');
            }
        });
    }else{ // 데이터베이스 객체가 초기화되지 않은 경우 실패응답 전송
        console.log('adduser 중 데이터베이스 연결 실패')
        res.redirect('/public/index.html');
    }
})


//========== 각종 함수 ============//

//사용자 인증 함수
var authUser = function(database,id,password,callback){
    console.log('authUser 호출됨 : ' +id+', '+password);

    //users 컬렉션 참조
    var users = database.collection('users');

    // 아이디와 비밀번호를 이용해 검색
    users.find({"id":id,"password":password}).toArray(function(err,docs){
        if(err){//에러 발생 시 콜백 함수를 호출하면서 에러 객체 전달
            callback(err,null);
            return;
        }
        if(docs.length > 0){
            console.log('[%s],[%s] 일치하는 사용자 찾음', id, password);
            callback(null,docs);
        }else{
            console.log("일치하는 사용자를 찾지 못함.");
            callback(null,null);
        }
    });
}

//사용자 추가 함수
var addUser = function(database,id,password,name,callback){
    console.log('addUser 호출됨 : '+id+', '+password+', '+name);

    //user 컬렉션 참조
    var users = database.collection('users');

    //id, password, username을 이용해 사용자 추가
    users.insertMany([{"id":id,"password":password,"name":name}],function(err,result){
        if(err){//에러 발생 시 콜백 함수를 호출하면서 에러 객체 전달
            callback(err,null);
            return;
        }

        //에러 아닌 경우, 콜백 함수를 호출하면서 결과 객체 전달
        if(result.insertedCount > 0){
            console.log("사용자 레코드 추가됨 : "+result.insertedCount);
        }else{
            console.log('추가된 레코드가 없음.');
        }

        callback(null,result);
    });
}


//======= 서버 시작 ========//

//프로세스 종료 시에 데이터베이스 연결 해제
process.on('SIGTERM',function(){
    console.log('프로세스가 종료됩니다.');
    app.close();
});

app.on('close',function(){
    console.log('Express 서버 객체가 종료됩니다.');
    if(database){
        database.close();
    }
});

//Express 서버 시작
http.createServer(app).listen(app.get('port'),function(){
    console.log('서버가 시작되었습니다. 포트 : '+app.get('port'));

    //데이터베이스 연결을 위한 함수 호출
    connectDB();
});