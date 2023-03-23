//필요한 태그 생성
const t_h_line = document.querySelectorAll(".box_wrap .h_line");
const t_text_box = document.querySelectorAll(".box_wrap .a_box");
const allow = document.querySelectorAll(".box_wrap .allow");

//자주하는 질문 영역 기능
t_h_line.forEach((item,index)=>{
    item.addEventListener("click",(e)=>{
        //페이지 이동방지
        e.preventDefault();

        //브라우저 가로크기값 가져오기
        let view_width = document.body.offsetWidth;

        //모바일로 볼 경우
        if(view_width <= 430){
            tab_clear(375);
            t_text_box[index].style.height = "375px";
        }
        //그 외
        else {
            tab_clear(202);
            t_text_box[index].style.height = "202px";
        }
    });
});

function tab_clear(int){
    //활성화 전 전부 비활성화
    t_text_box.forEach((item,index)=>{
        item.style.height = 0;
    });
}