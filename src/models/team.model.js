import mongoose from 'mongoose';  

/* Schema */  
const teamSchema = mongoose.Schema(  
    {  
        teamName: {  
            type: String,  
            required: [true, "Please enter the team name"],  
        },  
        description: {  
            type: String,  
        },  
        teamPurpose: {  
            type: String,  
            required: [true, "Please select a purpose for the team"],  
            enum: [  
                "Recruitment Team",  
                "Training and Development Team",  
                "Strategic Planning Team",  
                "Partner Support Team",  
                "Marketing Team",  
                "Sales Team",  
                "Product Development Team",  
                "Events Management Team",  
                "Tech Support Team",  
                "Content Creation Team",  
                "Compliance and Regulatory Team",  
                "Innovation Team",  
                "Recognition and Rewards Team",  
                "Networking Team",  
                "Feedback and Improvement Team"  
            ],  
        },  
        partnerId: {  
            type: mongoose.Schema.Types.ObjectId,  
            ref: 'User', // Assuming there's a User model to reference  
            required: true,  
        },  
    },  
    {  
        timestamps: true, // Automatically add createdAt and updatedAt fields  
    }  
);  

/* Model */  
export const TeamModel = mongoose.model('Team', teamSchema);