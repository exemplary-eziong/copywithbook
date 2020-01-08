var user = require('./user1');

function showUser(){
    return user.getUser().name+','+user.group.name;
}
console.log('사용자 정보 : %s',showUser())


// console.log('사용자 정보 : %s',showUser) -> showUser라는 함수의 구조 출력
// exports.group 이 module.exports에 의해 무시됨.