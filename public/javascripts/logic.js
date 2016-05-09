<script src="javascripts/jquery-2.2.3.js"></script>
<script src="javascripts/charArray.js"></script>

//Global variables
var correct = 0; //How many questions the user got right
var imgNum = 0;	//The total amount of questions answered
var imgPath = "images/img0.png";


$(document).ready(function() {
	console.log("Document ready - logic.js");
	$("#quizImg").attr("src",imgPath);
	//If the users adds/deletes a character from the input box
	//Check if it's valid and update error message accordingly
	$("#romaji").change(function() {
		if(!inputValid()) {
			$("#error").html("Fix inputs!");
		}
		else {
			$("#error").html("");
		}
	});//romaji.change


});//document.ready

//Check if user input is 1-3 lowercase characters
function inputValid() {
	var rj = $("#romaji").val().search(/^[a-z]{1,3}$/);
	return (rj != -1)
}
