$( document ).ready(function(){ 
	$('form').on("submit", function(event){
		event.preventDefault();
		$.post('php/sendmail.php', $("#form").serialize(), function(data) {
		  $('#formresponse').html('Thanks for getting in touch.  We mean it.').fadeIn('100');
		})
		$('#form')[0].reset() //Clear inputs
	});
})
