//시작 전 세팅
const express = require("express");
//데이터베이스의 데이터 입력, 출력을 위한 함수명령어 불러들이는 작업
const MongoClient = require("mongodb").MongoClient;
const moment = require("moment");
//원하는 나라의 시간대로 변경하는 라이브러리 사용
const momentTimezone = require("moment-timezone");

//로그인 검증을 위한 passport 라이브러리 불러들임
const passport = require('passport');
//Strategy(전략) -> 로그인 검증을 하기위한 방법을 쓰기위해 함수를 불러들이는 작업
const LocalStrategy = require('passport-local').Strategy;
//사용자의 로그인 데이터 관리를 위한 세션 생성에 관련된 함수 명령어 사용
const session = require('express-session');

//파일업로드 라이브러리 multer
const multer  = require('multer');
const { render } = require("ejs");

// express함수를 app에 대입
const app = express();
const port = process.env.PORT || 8080;
// const port = 8080;

app.set("view engine","ejs");
app.use(express.urlencoded({extended: true}));
app.use(express.static('html'));

//로그인 기능에 필요한 것
app.use(session({secret : 'secret', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());


MongoClient.connect("mongodb+srv://admin:qwer1234@portfolio3.zcxjh0m.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err) { return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("port3_db");

    //db연결이 제대로 됬다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });
});

//파일첨부 어디에 저장할 것인지에 대한 기능
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        //저장 경로
      cb(null, 'html/upload')
    },
    filename: function (req, file, cb) {
        //한글 안깨지기 위한 명령어
      cb(null, file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8') )
    }
});
  
const upload = multer({ storage: storage });

//로그인 기능
//실제 로그인 검증하는 경로로 요청 -> function 전에 검증을 위한 passport 실행
//failureRedirect -> 잘못입력했을경우 이동될 경로
//function(req,res){} <-- 여기다가 적는거는 아이디 비번 제대로 입력시 어떤페이지로 이동될 것인지 경로
app.post("/check/login",passport.authenticate('local', {failureRedirect : '/fail'}),
function(req,res){
    res.redirect("/"); //로그인 성공시 메인페이지로 이동
});

passport.use(new LocalStrategy({
    usernameField: 'user_id', //admin_login.ejs에서 입력한 아이디의 name값
    passwordField: 'user_pass', //admin_login.ejs에서 입력한 비밀번호의 name값
    session: true, //세션을 사용하겠습니까?
    passReqToCallback: false, //아이디와 비번말고도 다른항목들을 더 검사할 것인지 여부
  }, function (user_id, user_pass, done) { //id password 작명한거임(입력한 input값 담는 변수)
    // 로그인 제대로 되는지 확인
    console.log(user_id, user_pass);
    db.collection('join').findOne({ join_id: user_id }, function (err, result) {
      if (err) return done(err)
      //잘못 입력했을 때

      if (!result) return done(null, false, { message: '존재하지않는 아이디입니다.' })
      if (user_pass == result.join_pass) {
        return done(null, result)
      } else {
        return done(null, false, { message: '비밀번호가 맞지 않습니다.' })
      }
    })
}));

//데이터베이스에 있는 아이디와 비번이 일치하면
//세션을 생성하고 해당 아이디와 비번을 기록하여 저장하는 작업
passport.serializeUser(function (user, done) {
    done(null, user.join_id) //데이터베이스에 있는 아이디가 저장되어있는 프로퍼티 명 기술(user.뒤에)
});
 
//만들어진 세션을 전달해서 다른페이지에서도 해당 세션을 사용할 수 있도록 처리(페이지 접근제한)
passport.deserializeUser(function (user_id, done) {
    //데이터베이스에 있는 로그인했을때 아이디만 불러와서
    //다른페이지에서도 세션을 사용할 수 있도록 처리
    db.collection("join").findOne({join_id: user_id},function(err,result){
        done(null,result); //데이터베이스에서 가지고 온 아이디 -> 세션에 넣어서 다른페이지들에 전달
    });
});

//로그아웃 기능
app.get("/logout",function(req,res){
    req.session.destroy(function(err){
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

//메인 페이지 경로 요청
app.get("/",(req,res)=>{
    console.log(req.user);
    res.render("index", {userData: req.user});
});

//회원가입 페이지 경로 요청
app.get("/join",(req,res)=>{
    res.render("join",{userData:req.user});
}); 

//회원가입 데이터값 데이터베이스에 보내기
app.post("/add/join",(req,res)=>{
    db.collection("count").findOne({name:"가입자수"},(err,result)=>{
        db.collection("join").insertOne({
            join_no: result.joinCount + 1,
            join_id: req.body.id,
            join_nickname: req.body.nickname,
            join_pass: req.body.pass,
            join_email: req.body.email,
            join_tell: req.body.tell
        },(err,result)=>{
            db.collection("count").updateOne({name:"가입자수"},{$inc:{joinCount:1}},(err,result)=>{
                res.redirect("/");
            });
        });
    });
});

//로그인 페이지 경로 요청
app.get("/login",(req,res)=>{
    res.render("login",{userData:req.user});
});

//상품 페이지 경로 요청
app.get("/prd",(req,res)=>{
    db.collection("product").find({card_category:"추천카드"}).toArray((err,rmd_result)=>{
        db.collection("product").find({card_category:"멀티카드"}).toArray((err,multi_result)=>{
            db.collection("product").find({card_category:"신용카드"}).toArray((err,credit_result)=>{
                db.collection("product").find({card_category:"제휴카드"}).toArray((err,alli_result)=>{
                    db.collection("product").find({card_category:"체크카드"}).toArray((err,check_result)=>{
                        res.render("prd_list",{
                            userData: req.user,
                            rmdData: rmd_result,
                            mulData:multi_result,
                            creData:credit_result,
                            alliData:alli_result,
                            chkData:check_result
                        });
                    });
                });
            });
        });
    });
});

//관리자용 상품 등록 페이지 경로 요청
app.get("/admin/prd",(req,res)=>{
    db.collection("product").find().toArray((err,result)=>{
        res.render("admin_prd", {userData: req.user, prdData:result});
    });
});

//상품 데이터값 데이터베이스로 보내기
app.post("/add/prd",upload.single('card_file'),(req,res)=>{

    if(req.file){
        card_file = req.file.originalname;
    }
    else{
        card_file = null;
    }

    db.collection("count").findOne({name:"상품수"},(err,result)=>{
        db.collection("product").insertOne({
            // 카드 번호
            card_no: result.prdCount + 1,
            // 상품 분류
            card_category: req.body.card_category,
            // 상품 파일
            card_file: card_file,
            // 상품 이름
            card_name: req.body.card_name,
            // 상품 혜택1
            card_benefit1: req.body.card_benefit1,
            // 상품 혜택2
            card_benefit2: req.body.card_benefit2,
            // 상품 혜택3
            card_benefit3: req.body.card_benefit3,
            // 작성자
            write_id: req.body.write_id
        },(err,result)=>{
            db.collection("count").updateOne({name:"상품수"},{$inc:{prdCount:1}},(err,result)=>{
                res.redirect("/admin/prd");
            });
        });
    });
});

//카드 상세페이지 경로요청
app.get("/card/detail/:no",(req,res)=>{
    db.collection("product").findOne({card_no: Number(req.params.no)},(err,result)=>{
        res.render("prd_detail", {prdData: result, userData: req.user});
    });
});

//카드 데이터값 삭제하기
app.get("/card/delete/:no",(req,res)=>{
    db.collection("product").deleteOne({card_no: Number(req.params.no)},(err,result)=>{
        res.redirect("/prd");
    });
});

//카드 수정페이지 경로요청
app.get("/card/update/:no",(req,res)=>{
    db.collection("product").findOne({card_no: Number(req.params.no)},(err,result)=>{
        res.render("prd_update",{prdData:result, userData: req.user});
    });
});

//카드 수정데이터값 데이터베이스에 보내기
app.post("/update/prd",upload.single('card_file'),(req,res)=>{
    //카드 파일값
    if(req.file){ //새로 파일을 골랐으면 그 파일의 이름으로 저장
        card_file = req.file.originalname;
    }
    else{ //파일을 안골랐다면 기존 파일이름 저장
        card_file = req.body.sel_file;
    }

    db.collection("product").updateOne({card_no: Number(req.body.card_no)},{$set:{
        // 상품 분류
        card_category: req.body.card_category,
        // 상품 파일
        card_file: card_file,
        // 상품 이름
        card_name: req.body.card_name,
        // 상품 혜택1
        card_benefit1: req.body.card_benefit1,
        // 상품 혜택2
        card_benefit2: req.body.card_benefit2,
        // 상품 혜택3
        card_benefit3: req.body.card_benefit3,
    }},(err,result)=>{
        res.redirect("/card/detail/" + req.body.card_no);
    });
});

//공지사항 목록페이지 경로 요청
app.get("/notice",(req,res)=>{
    db.collection("notice").find().toArray((err,result)=>{
        res.render("notice_list",{ntiData:result, userData:req.user});
    });
});

//관리자용 공지사항 등록 페이지 경로 요청
app.get("/admin/notice",(req,res)=>{
    db.collection("notice").find().toArray((err,result)=>{
        res.render("admin_notice_insert",{ntiData:result,  userData: req.user});
    });
});

//공지사항 데이터값 데이터베이스에 보내기
app.post("/add/notice",(req,res)=>{
    db.collection("count").findOne({name:"공지사항수"},(err,result)=>{
        db.collection("notice").insertOne({
            notice_no: result.noticeCount + 1,
            notice_title: req.body.notice_title,
            notice_author_id: req.user.join_id,
            notice_author: req.user.join_nickname,
            notice_context: req.body.notice_context,
            notice_review: 0,
            notice_date: moment().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm")
        },(err,result)=>{
            db.collection("count").updateOne({name:"공지사항수"},{$inc:{noticeCount:1}},(err,result)=>{
                res.redirect("/admin/notice");
            });
        });
    });
});

//공지사항 상세페이지 경로 요청
app.get("/notice/detail/:no",(req,res)=>{
    //조회수를 올리기 위함
    db.collection("notice").updateOne({notice_no: Number(req.params.no)},{$inc:{notice_review:1}},(err,result)=>{
        db.collection("notice").findOne({notice_no: Number(req.params.no)},(err,result)=>{
            res.render("notice_detail",{ntiData:result, userData:req.user});
        });
    });
});

//공지사항 수정페이지 경로 요청
app.get("/notice/update/:no",(req,res)=>{
    db.collection("notice").findOne({notice_no: Number(req.params.no)},(err,result)=>{
        res.render("admin_notice_update",{ntiData:result});
    });
});

//공지사항 수정데이터값 데이터베이스에 보내기
app.post("/update/notice",(req,res)=>{
    db.collection("notice").updateOne({notice_no: Number(req.body.notice_no)},{$set:{
        notice_title: req.body.notice_title,
        notice_context: req.body.notice_context
    }},(err,result)=>{
        res.redirect("/notice/detail/" + req.body.notice_no);
    });
});

//공지사항 삭제
app.get("/notice/delete/:no",(req,res)=>{
    db.collection("notice").deleteOne({notice_no: Number(req.params.no)},(err,result)=>{
        res.redirect("/notice");
    });
});

//공지사항 검색 기능
app.get("/notice/search",(req,res)=>{

    let notice_search = [
        {
            $search: {
                index: 'notice_search',
                text: {
                    //내가 입력한 값
                    query:req.query.search,
                    //해당 컬렉션에서 위에서 입력한 단어가 포함되어있는 것 찾아와줌
                    path:req.query.n_category
                }
            }
        }
    ]

    db.collection("notice").aggregate(notice_search).toArray((err,result)=>{
        res.render("notice_list", {ntiData: result,userData: req.user});
    });

});

//매장 목록 페이지 경로 요청
app.get("/store",(req,res)=>{
    db.collection("store").find().toArray((err,result)=>{
        console.log(req.user);
        res.render("store_list",{stData:result, userData: req.user});
    });
});

//관리자용 매장 등록 페이지 경로 요청
app.get("/admin/store",(req,res)=>{
    db.collection("store").find().toArray((err,result)=>{
        res.render("admin_store",{stData: result, userData: req.user});
    });
});

//매장 관련 데이터값 데이터베이스에 보내기
app.post("/add/store",upload.single('file'),(req,res)=>{

    if(req.file){
        store_file = req.file.originalname;
    }
    else {
        store_file = null;
    }

    db.collection("count").findOne({name:"매장수"},(err,result)=>{
        db.collection("store").insertOne({
            store_no: result.storeCount + 1,
            store_name: req.body.name,
            store_file: store_file,
            store_tell: req.body.tell,
            store_load: req.body.load,
            store_sido: req.body.sido,
            store_gugun: req.body.gugun,
            store_address: req.body.address,
            write_id: req.user.join_id
        },(err,result)=>{
            db.collection("count").updateOne({name:"매장수"},{$inc:{storeCount:1}},(err,result)=>{
                res.redirect("/admin/store");
            });
        });
    });
});

//이벤트 목록 페이지 경로 요청
app.get("/event",(req,res)=>{
    db.collection("event").find().toArray((err,result)=>{
        res.render("event_list",{evtData:result, userData:req.user});
    });
});

//관리자용 이벤트 등록 페이지 경로 요청
app.get("/admin/event",(req,res)=>{
    db.collection("event").find().toArray((err,result)=>{
        res.render("admin_event_insert",{evtData:result, userData:req.user});
    });
});

//이벤트 관련 데이터값 데이터베이스 보내기
app.post("/add/event",upload.single('file'),(req,res)=>{

    //파일이 있을 시
    if(req.file){
        event_file = req.file.originalname
    }
    else {
        event_file = null
    }

    db.collection("count").findOne({name:"이벤트수"},(err,result)=>{
        db.collection("event").insertOne({
            //이벤트 번호
            event_no: result.eventCount + 1,
            //이벤트 제목
            event_title: req.body.title,
            //이벤트 날짜
            event_date: req.body.date,
            //이벤트 파일
            event_file: event_file,
            //이벤트 내용
            event_context: req.body.context,
            //이벤트 조회수
            event_review: 0,
            //이벤트 작성자
            write_id: req.user.join_id
        },(err,result)=>{
            db.collection("count").updateOne({name:"이벤트수"},{$inc:{eventCount:1}},(err,result)=>{
                res.redirect("/admin/event");
            });
        });
    });
});

//이벤트 상세페이지 경로 요청
app.get("/event/detail/:no",(req,res)=>{
    db.collection("event").updateOne({event_no: Number(req.params.no)},{$inc:{event_review:1}},(err,result)=>{
        db.collection("event").findOne({event_no: Number(req.params.no)},(err,result)=>{
            res.render("event_detail",{evtData:result, userData:req.user});
        });
    });
});

//이벤트 삭제페이지 경로 요청
app.get("/event/delete/:no",(req,res)=>{
    db.collection("event").deleteOne({event_no: Number(req.params.no)},(err,result)=>{
        res.redirect("/event");
    });
});

//이벤트 수정페이지 경로 요청
app.get("/event/update/:no",(req,res)=>{
    db.collection("event").findOne({event_no: Number(req.params.no)},(err,result)=>{
        res.render("admin_event_update", {evtData:result, userData:req.user});
    });
});

//이벤트 수정데이터값 데이터베이스에 보내기
app.post("/update/event",upload.single('file'),(req,res)=>{

    if(req.file){
        event_file = req.file.originalname;
    }
    else {
        event_file = req.body.origin_file;
    }

    db.collection("event").updateOne({event_no: Number(req.body.event_no)},{$set:{
        //이벤트 제목
        event_title: req.body.title,
        //이벤트 날짜
        event_date: req.body.date,
        //이벤트 파일
        event_file: event_file,
        //이벤트 내용
        event_context: req.body.context
    }},(err,result)=>{
        res.redirect("/event/detail/" + req.body.event_no);
    });
});

//문의게시판 목록페이지 경로요청
app.get("/qna",(req,res)=>{
    // db.collection("qna").find().toArray((err,result)=>{
        db.collection("qna").find({qna_author_id:req.user.join_id}).toArray((err,u_result)=>{
            // console.log(u_result);
            res.render("qna_list", {/*qnaData:result,*/ qnaData:u_result, userData:req.user});
        });
    // });
});

//문의게시판 작성페이지 경로요청
app.get("/insert/qna",(req,res)=>{
    res.render("qna_insert", {userData:req.user});
});

//문의게시판 데이터값 데이터베이스에 보내기
app.post("/add/qna",(req,res)=>{
    db.collection("count").findOne({name:"문의사항수"},(err,result)=>{
        db.collection("qna").insertOne({
            //질문 번호
            qna_no: result.qnaCount + 1,
            //질문 제목
            qna_title: req.body.title,
            //질문 내용
            qna_context: req.body.context,
            //작성자 아이디
            qna_author_id: req.user.join_id,
            //작성자 닉네임
            qna_author: req.user.join_nickname,
            //작성날짜
            qna_date: moment().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm")
        },(err,result)=>{
            db.collection("count").updateOne({name:"문의사항수"},{$inc:{qnaCount:1}},(err,result)=>{
                res.redirect("/qna");
            });
        });
    });
});

//문의게시판 상세페이지 경로 요청
app.get("/qna/detail/:no",(req,res)=>{
    //매칭되는 데이터를 갖고오기 위함
    db.collection("qna").findOne({qna_no:Number(req.params.no)},(err,qna_result)=>{
        db.collection("answer").find({qna_no:qna_result.qna_no}).toArray((err,ans_result)=>{
            res.render("qna_detail",{qnaData:qna_result, aData:ans_result, userData:req.user});
        });
    });
});

//문의게시판 유저 질문데이터 수정페이지 경로 요청
app.get("/user/qna/update/:no",(req,res)=>{
    db.collection("qna").findOne({qna_no: Number(req.params.no)},(err,result)=>{
        res.render("qna_update", {qnaData:result,userData:req.user});
    });
});

//문의게시판 유저 질문데이터 수정데이터값 데이터베이스에 보내기
app.post("/user/update/qna",(req,res)=>{
    db.collection("qna").updateOne({qna_no: Number(req.body.qna_no)},{$set:{
        //질문 제목
        qna_title: req.body.title,
        //질문 내용
        qna_context: req.body.context
    }},(err,result)=>{
        res.redirect("/qna/detail/" + req.body.qna_no);
    });
});

//문의게시판 유저 질문데이터 삭제
app.get("/user/qna/delete/:no",(req,res)=>{
    db.collection("qna").deleteOne({qna_no: Number(req.params.no)},(err,result)=>{
        res.redirect("/qna");
    });
});

//문의게시판 답변 데이터값 데이터베이스에 보내기
app.post("/answer/qna",(req,res)=>{
    //답변 번호를 달기 위함
    db.collection("count").findOne({name:"답변수"},(err,result)=>{
        //부모 게시글을 알기위함
        db.collection("qna").findOne({qna_no:Number(req.body.qna_no)},(err,q_result)=>{
            db.collection("answer").insertOne({
                //답변 번호
                a_no: result.aCount + 1,
                //게시글 번호
                qna_no: q_result.qna_no,
                //답변 내용
                a_context: req.body.admin_answer
            },(err,result)=>{
                db.collection("count").updateOne({name:"답변수"},{$inc:{aCount:1}},(err,result)=>{
                    res.redirect("/qna/detail/" + req.body.qna_no);
                });
            });
        });
    });
});

//문의게시판 답변 수정페이지 경로 요청
//답변글이 여러개라 무엇을 가져와야하는지 모르는 것 같음
app.get("/admin/answer/update/:no",(req,res)=>{
    db.collection("answer").findOne({a_no: Number(req.params.no)},(err,result)=>{
        res.render("admin_qna_update", {aData:result,userData:req.user});
    });
});


//문의게시판 답변 수정데이터값 데이터베이스에 보내기
app.post("/admin/update/qna",(req,res)=>{
    db.collection("answer").updateOne({a_no: Number(req.body.a_no)},{$set:{
        a_context: req.body.admin_answer
    }},(err,result)=>{
        db.collection("answer").findOne({a_no: Number(req.body.a_no)},(err,result)=>{
            res.redirect("/qna/detail/" + result.qna_no);
        });
    });
});

//문의게시판 답변 삭제
app.get("/admin/answer/delete/:no",(req,res)=>{
    db.collection("answer").deleteOne({a_no: Number(req.params.no)},(err,result)=>{
        res.redirect("/qna");
    });
});
